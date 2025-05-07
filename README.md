## Shopify B2B Pricing - Algolia Transformation

### To Run:
1. Go To Algolia Application -> Data Sources -> Connectors.
2. Find the Shopify Connector in Destinations tab. Should be named "{{shopify_store_name}} products primary destination"
3. Click on edit transformations -> Create new transformation.
4. Paste the transformation code.
5. Add your Shopify development app token as a secret. You can also add the catalogue ID as a secret if you would like. 
6. In order to test you will need to grab the objectID (variantID) and the parentID (id) from a shopify product and add it in the sample products section.

### Summary of Code
This code is designed to grab pricing from one or a few catalogues. If you would like to grab prices from all the catalogues you can refactor the code to first get a list of all catalogues that a product belongs to and then the rest of the code will work the same. 

### Code Output

```
{
  ...record attributes
  b2b_pricing: [
    {1234: 500}, //{catalogID: price}
    {4231: 550}
  ]
}
```
