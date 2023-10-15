// app.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto-js');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const port = 3000; // You can change the port as needed

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
app.post('/api/contacts', (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  // Generate a unique ID for the new contact
  const contactId = crypto.SHA256(`${firstName}${lastName}${phoneNumber}`).toString();

  // Encrypt each field separately
  const encryptedFirstName = crypto.AES.encrypt(firstName, 'your-secret-key').toString();
  const encryptedLastName = crypto.AES.encrypt(lastName, 'your-secret-key').toString();
  const encryptedPhoneNumber = crypto.AES.encrypt(phoneNumber, 'your-secret-key').toString();

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
    existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) {
    // If the file doesn't exist or is empty, existingData will be an empty array
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
app.get('/api/contacts', (req, res) => {
  // Read data from the file
  const data = fs.readFileSync(dataFile, 'utf8').trim(); // Remove leading/trailing whitespace

  if (!data) {
    return res.status(200).json([]); // Return an empty array if the file is empty
  }

  const encryptedContacts = data.split('\n');

  const contacts = encryptedContacts.map((encryptedData) => {
    try {
      const decryptedData = crypto.AES.decrypt(encryptedData, 'your-secret-key').toString(crypto.enc.Utf8);
      return JSON.parse(decryptedData);
    } catch (err) {
      console.error('Error parsing or decrypting contact:', err);
      return null; // Skip invalid contacts
    }
  });

  // Filter out any invalid contacts
  const validContacts = contacts.filter((contact) => contact !== null);

  res.json(validContacts);
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

  // Encrypt each field separately
  const encryptedFirstName = crypto.AES.encrypt(firstName, 'your-secret-key').toString();
  const encryptedLastName = crypto.AES.encrypt(lastName, 'your-secret-key').toString();
  const encryptedPhoneNumber = crypto.AES.encrypt(phoneNumber, 'your-secret-key').toString();

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
    // Update the contact's information
    existingData[contactIndex].firstName = encryptedFirstName;
    existingData[contactIndex].lastName = encryptedLastName;
    existingData[contactIndex].phoneNumber = encryptedPhoneNumber;

    // Write the updated data back to the file
    fs.writeFileSync(dataFile, JSON.stringify(existingData), 'utf8');

    res.status(200).json({ message: 'Contact updated successfully' });
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

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
