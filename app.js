// app.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto-js');
const swaggerUi = require('swagger-ui-express');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const swaggerJSDoc = require('swagger-jsdoc');
const app = express();
const port = 3000; // You can change the port as needed

// Enable CORS for all routes
app.use(cors());

// Define options for swagger-jsdoc
const options = {
  definition: {
    openapi: '3.0.0', // Specify the version of OpenAPI you're using
    info: {
      title: 'Contact Management API',
      version: '1.0.0',
      description: 'API for managing contacts with encryption',
    },
  },
  apis: ['./app.js'], // Provide the path to the file where your Swagger definitions are
};

const swaggerSpec = swaggerJSDoc(options);

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// Your data file for storing encrypted contacts
const dataFile = 'contacts-data.json';

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Create a new contact.
 *     description: Create a new contact with first name, last name, and phone number.
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *             required:
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *     responses:
 *       '200':
 *         description: Contact created successfully.
 *       '400':
 *         description: Bad request. Invalid input data.
 */

// Function to validate contact data
function validateContactData(data) {
  if (!data.firstName || typeof data.firstName !== 'string') {
    return false;
  }
  if (!data.lastName || typeof data.lastName !== 'string') {
    return false;
  }
  if (!data.phoneNumber || typeof data.phoneNumber !== 'string') {
    return false;
  }
  return true;
}

app.post('/api/contacts', (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  // Validate the input data
  if (!validateContactData(req.body)) {
    return res.status(400).json({ message: 'Bad request. Invalid input data' });
  }

  // Generate a unique UUID for the new contact
  const contactId = uuidv4(); // Generates a random UUID

  // Encrypt each field separately
  const encryptedFirstName = crypto.AES.encrypt(firstName, '12345').toString();
  const encryptedLastName = crypto.AES.encrypt(lastName, '12345').toString();
  const encryptedPhoneNumber = crypto.AES.encrypt(phoneNumber, '12345').toString();

  // Create a contact object
  const newContact = {
    id: contactId,
    firstName: encryptedFirstName,
    lastName: encryptedLastName,
    phoneNumber: encryptedPhoneNumber,
  };

  // Read existing data from the file
  let existingData = [];
  try {
    const data = fs.readFileSync(dataFile, 'utf8');
    if (data) {
      existingData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading or processing data:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }

  // Add the new contact to the existing data
  existingData.push(newContact);

  // Write the updated data back to the file
  fs.writeFileSync(dataFile, JSON.stringify(existingData), 'utf8');

  res.json({ message: 'Contact created successfully' });
});

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get all contacts.
 *     description: Retrieve a list of all contacts.
 *     tags: [Contacts]
 *     responses:
 *       '200':
 *         description: List of contacts.
 */

// Function to decrypt and parse contact data
app.get('/api/contacts', (req, res) => {
  try {
    const data = fs.readFileSync(dataFile, 'utf8').trim();
    if (!data) {
      return res.status(200).json([]); // Return an empty array if the file is empty
    }

    const encryptedContacts = JSON.parse(data);
    const contacts = encryptedContacts.map((contact) => {
      // Decrypt firstName, lastName, and phoneNumber while leaving id as is
      const decryptedContact = {
        id: contact.id,
        firstName: crypto.AES.decrypt(contact.firstName, '12345').toString(crypto.enc.Utf8),
        lastName: crypto.AES.decrypt(contact.lastName, '12345').toString(crypto.enc.Utf8),
        phoneNumber: crypto.AES.decrypt(contact.phoneNumber, '12345').toString(crypto.enc.Utf8),
      };

      return decryptedContact;
    });

    // Filter out any invalid contacts
    const validContacts = contacts.filter((contact) => contact.firstName && contact.lastName && contact.phoneNumber);

    res.json(validContacts);
  } catch (error) {
    console.error('Error reading or processing data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: Update a contact by ID.
 *     description: Update the contact information with a specific ID.
 *     tags: [Contacts]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the contact to update.
 *         required: true
 *         type: string
 *       - name: body
 *         in: body
 *         description: Updated contact details.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             phoneNumber:
 *               type: string
 *           required:
 *             - firstName
 *             - lastName
 *             - phoneNumber
 *     responses:
 *       '200':
 *         description: Contact updated successfully.
 *       '400':
 *         description: Bad request. Invalid input data.
 *       '404':
 *         description: Contact not found.
 */
app.put('/api/contacts/:id', (req, res) => {
  const contactId = req.params.id;
  const { firstName, lastName, phoneNumber } = req.body;

  // Read existing data from the file
  let existingData = [];
  try {
    const data = fs.readFileSync(dataFile, 'utf8');
    if (data) {
      existingData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading data:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }

  // Find the index of the contact with the provided ID
  const contactIndex = existingData.findIndex(contact => contact.id === contactId);

  // If the contact with the provided ID is found
  if (contactIndex !== -1) {
    // Decrypt the existing contact
    const decryptedContact = existingData[contactIndex];

    // Decrypt the existing data fields and update them with the new values
    const decryptedFirstName = crypto.AES.decrypt(decryptedContact.firstName, '12345').toString(crypto.enc.Utf8);
    const decryptedLastName = crypto.AES.decrypt(decryptedContact.lastName, '12345').toString(crypto.enc.Utf8);
    const decryptedPhoneNumber = crypto.AES.decrypt(decryptedContact.phoneNumber, '12345').toString(crypto.enc.Utf8);

    // Update the contact's information with the new values
    decryptedContact.firstName = firstName;
    decryptedContact.lastName = lastName;
    decryptedContact.phoneNumber = phoneNumber;

    // Encrypt the updated contact
    decryptedContact.firstName = crypto.AES.encrypt(decryptedFirstName, '12345').toString();
    decryptedContact.lastName = crypto.AES.encrypt(decryptedLastName, '12345').toString();
    decryptedContact.phoneNumber = crypto.AES.encrypt(decryptedPhoneNumber, '12345').toString();

    // Replace the existing data with the updated contact
    existingData[contactIndex] = decryptedContact;

    // Write the updated and encrypted data back to the file
    fs.writeFileSync(dataFile, JSON.stringify(existingData), 'utf8');

    // Return the updated contact
    res.status(200).json({ message: 'Contact updated successfully', updatedContact: decryptedContact });
  } else {
    // If the contact with the provided ID is not found
    res.status(404).json({ message: 'Contact not found' });
  }
});

  /**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Delete a contact by ID.
 *     description: Delete the contact with a specific ID.
 *     tags: [Contacts]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the contact to delete.
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: Contact deleted successfully.
 *       '404':
 *         description: Contact not found.
 */
  app.delete('/api/contacts/:id', (req, res) => {
    const contactId = req.params.id;
  
    // Read existing data from the file
    let existingData = [];
    try {
      existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (error) {
      // If the file doesn't exist or is empty, existingData will be an empty array
    }
  
    // Find the index of the contact with the provided ID
    const contactIndex = existingData.findIndex(contact => contact.id === contactId);
  
    // If the contact with the provided ID is found
    if (contactIndex !== -1) {
      // Remove the contact from the existing data array
      existingData.splice(contactIndex, 1);
  
      // Write the updated data back to the file
      fs.writeFileSync(dataFile, JSON.stringify(existingData), 'utf8');
  
      res.status(200).json({ message: 'Contact deleted successfully' });
    } else {
      // If the contact with the provided ID is not found
      res.status(404).json({ message: 'Contact not found' });
    }
  });  

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

});
