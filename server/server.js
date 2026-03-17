// server.js — L Train departure board backend

const express = require('express');
const fetch = require('node-fetch');
const { transit_realtime } = require('gtfs-realtime-bindings');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow your webpage to talk to this server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// The MTA feed URL for the L train
const MTA_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l';

// L train stop IDs for Bedford Av
// L06N = northbound (to Manhattan), L06S = southbound (to Canarsie)
const STOP_N = 'L06N';
const STOP_S = 'L06S';

app.get('/arrivals', async (req, res) => {
  try {

    // Fetch the raw binary feed from the MTA
    const response = await fetch(MTA_URL);
    const buffer = await response.arrayBuffer();

    // Decode the binary data into something readable
    const feed = transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const now = Math.floor(Date.now() / 1000);
    const manhattan = [];
    const canarsie = [];

    // Loop through every train in the feed
    for (const entity of feed.entity) {
      if (!entity.tripUpdate) continue;

      for (const stop of entity.tripUpdate.stopTimeUpdate) {

        // Check if this train is stopping at Bedford Av
        if (stop.stopId === STOP_N) {
          const t = stop.arrival?.time?.toNumber();
          if (t && t > now) manhattan.push(t);
        }
        if (stop.stopId === STOP_S) {
          const t = stop.arrival?.time?.toNumber();
          if (t && t > now) canarsie.push(t);
        }
      }
    }

    // Sort by soonest first, return next 4 in each direction
    manhattan.sort((a, b) => a - b);
    canarsie.sort((a, b) => a - b);

    res.json({
      manhattan: manhattan.slice(0, 4),
      canarsie: canarsie.slice(0, 4),
      now: now
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch MTA data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});