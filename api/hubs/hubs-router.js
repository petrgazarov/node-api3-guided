const express = require('express');
const Hubs = require('./hubs-model.js');
const Messages = require('../messages/messages-model.js');

const router = express.Router();

router.get('/', (req, res, next) => {
  Hubs.find(req.query)
    .then(hubs => {
      res.status(200).json(hubs);
    })
    .catch(error => next({ errorMessage: 'Error retrieving the hubs' }));
});

router.get('/:id', (req, res) => {
  Hubs.findById(req.params.id)
    .then(hub => {
      if (hub) {
        res.status(200).json(hub);
      } else {
        res.status(404).json({ message: 'Hub not found' });
      }
    })
    .catch(error => next({ errorMessage: 'Error retrieving the hub' }));
});

router.post('/', (req, res) => {
  Hubs.add(req.body)
    .then(hub => {
      res.status(201).json(hub);
    })
    .catch(error => next({ errorMessage: 'Error adding the hub' }));
});

router.delete('/:id', (req, res) => {
  Hubs.remove(req.params.id)
    .then(count => {
      if (count > 0) {
        res.status(200).json({ message: 'The hub has been nuked' });
      } else {
        res.status(404).json({ message: 'The hub could not be found' });
      }
    })
    .catch(error => next({ errorMessage: 'Error removing the hub' }));
});

router.put('/:id', (req, res) => {
  Hubs.update(req.params.id, req.body)
    .then(hub => {
      if (hub) {
        res.status(200).json(hub);
      } else {
        res.status(404).json({ message: 'The hub could not be found' });
      }
    })
    .catch(error => next({ errorMessage: 'Error updating the hub' }));
});

router.get('/:id/messages', (req, res) => {
  Hubs.findHubMessages(req.params.id)
    .then(messages => {
      res.status(200).json(messages);
    })
    .catch(error => next({ errorMessage: 'Error getting the messages for the hub' }));
});

router.post('/:id/messages', (req, res) => {
  const messageInfo = { ...req.body, hub_id: req.params.id };

  Messages.add(messageInfo)
    .then(message => {
      res.status(210).json(message);
    })
    .catch(error => next({ errorMessage: 'Error adding message to the hub' }));
});

//----------------------------------------------------------------------------//
// USING CENTRALIZED ERROR HANDLING
//----------------------------------------------------------------------------//
// In the route handlers above, we implemented catch() that calls
// middleware's next() callback with details about the error. We do this
// to avoid repeating the same logic in route handlers, and to make it easier
// to manage our error handling code.
//
// Note that this error handler processes errors that happen in the hubs router.
// We have another custom error handler in server.js that would process errors
// that happen in the root route handler.
//----------------------------------------------------------------------------//
router.use((err, req, res, next) => {
  const message = err?.errorMessage || 'Something went wrong in hubs router';

  res.status(500).json({ message });
});

module.exports = router;
