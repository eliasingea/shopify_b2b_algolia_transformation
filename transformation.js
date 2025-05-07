/**
 * This is the default javascript transformation function, you cannot rename it or change its signature.
 * This function will be called for each item in the dataset.
 * @param {SourceRecord} record - Represent one item from your dataset - Type is inferred from the input record.
 * @param {Helper} helper - Use it to reference Secrets and get Metadata.
 * @returns {SourceRecord|Array<SourceRecord>} - Return a record or an array of records.
 */
async function transform(record, helper) {
  const secret = helper.secrets.get('SHOPIFY');
  console.log(secret)
  const b2b_pricing = await getAllCatalogs(secret, record); 

  record.b2b_pricing = b2b_pricing; 
  // If you want to exclude a record, you can just return undefined.
  // If you want to return multiple records, you can return an array of records.
  return record;
}

async function getAllCatalogs(secret, record) {
  const publishedCatalogs = await getProductCatalogInfo(record.id, secret);
  let b2b_pricing = {}
  for (let catalog of publishedCatalogs) {
    let priceData = await getPriceInfo(record.objectID, catalog, secret); 
    let catalogID = catalog.substring(
      catalog.lastIndexOf("/") + 1,
      catalog.length
    );
    b2b_pricing[catalogID] = priceData
  }
  return b2b_pricing; 
}


async function fetchGraphQL(query, secret) {
  let response;
  let retries = 0;
  while (retries < 5) {
    const res = await fetch(
      "https://elias-dev-store.myshopify.com/admin/api/2023-10/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": secret,
        },
        body: JSON.stringify({ query }),
      }
    );
    if (res.status === 429) {
      // Shopify returned too many requests
      const waitTime = Math.pow(2, retries) * 1000;
      console.warn(`Rate limit hit (429). Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      retries++;
      continue;
    }

    response = await res.json();

    const available =
      response.extensions?.cost?.throttleStatus?.currentlyAvailable;
    const restoreRate = response.extensions?.cost?.throttleStatus?.restoreRate;

    if (available !== undefined && available < 10) {
      const waitTime = Math.ceil((10 - available) / restoreRate) * 1000;
      console.log(`Throttling: waiting ${waitTime}ms for tokens to restore...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    return response.data;
  }
}

async function getProductCatalogInfo(productID, secret) {
  
  const query = `
    query {
      product(id: "gid://shopify/Product/${productID}") {
        id
        title
        resourcePublicationsV2(first: 10, catalogType: COMPANY_LOCATION) {
          edges {
            node {
              publication {
                catalog {
                  id
                  title
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, secret);
  const product = data.product;

  // Extract a list of catalog objects with id and title
  const publishedCatalogs = product.resourcePublicationsV2.edges.map((e) => {
    return e.node.publication.catalog.id;
  });

  return publishedCatalogs
}

async function getPriceInfo(objectID, catalogID, secret) {
  const query = `
      query {
      catalog(id: "${catalogID}") {
        id
        title
        status
        priceList {
          id
          name
          currency
          prices(first: 1, query: "variant_id:${objectID}") {
            nodes {
              variant {
                id
              }
              price {
                amount
                currencyCode
              }
            }
          }
        }

      }
    }
  `;

  const data = await fetchGraphQL(query, secret);
  const catalog = data.catalog;
  const priceList = catalog.priceList;
  const prices = priceList.prices.nodes;
  const activeStatus = catalog.status === "ACTIVE";
  if (activeStatus && prices.length > 0) {
    return parseFloat(prices[0].price.amount)
  }
  console.log("Price Data:", priceData);
  return priceData;
}