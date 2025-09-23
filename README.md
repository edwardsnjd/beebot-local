Beebot
======

A toy game to explore webrtc on mobile browsers as control pads for a simple game.

Features
--------

- Single shared game with players as controllers of the beebot on screen
- Multiple players can join the game, they all get a control pad
- All web based, only browsers needed
- All peer-to-peer client based state only, no server state (web app served as static files)

Design
------

- Game state:
    - State
    - Bot
        - Position
            - X: int
            - Y: int
        - Orientation: int
- Game UI:
    - Open space, beebot on screen
- Player controls UI:
    - Simple buttons

Communication
-------------

1. Load page (/index.html)
2. By default start "Host", give link to "Player" URL (/player.html)
3. For host: create and display game, give unique random Game ID, provide link to Player to join Game (/player.html?game=ID)
3. For player: enter game ID to join (if not provided in URL)
4. Player starts sending commands to host
5. Host continually processes commands, updating and displaying game state

Tech stack
----------

- SPA
- Vanilla JS where possible
    - Reset UI each state change?
    - WebRTC for Host-Player connection
    - WebSocket signalling for WebRTC negotiation
    - Browser motion API for events
    - Single `main.js` script loaded as module in HTML
    - Other `.js` files imported normally, browser will load
- `qr-code` library (single webcomponent)

Development
-----------

There is no build step but in order to use the browser motion API there's a need to access the client app over HTTPS.  Easiest way to do that is make sure your dev machine announces itself via mDNS (MacOS has bonjour, Linux has avahi) then use "<hostname>.local":

```bash
DUMMY_HOSTNAME=<changethis>.local make server
```
