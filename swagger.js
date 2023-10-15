// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./swaggerDefinition');

const options = {
  swaggerDefinition,
  apis: ['./app.js'], // Path to the main app file (where you define your routes)
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
