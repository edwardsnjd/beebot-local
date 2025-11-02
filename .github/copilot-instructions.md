# Copilot Instructions for Beebot Local

## Project Overview

Beebot is a toy game exploring WebRTC on mobile browsers as control pads for a simple game. It's a peer-to-peer, browser-based game where:
- A single shared game runs with players as controllers of the beebot on screen
- Multiple players can join and control the game
- All web-based, no server state required (served as static files)
- Uses WebRTC for peer-to-peer communication

## Architecture

### Core Components

- **Host** (`src/js/host.js`): Main game display and state management
- **Remote** (`src/js/remote.js`): Control pad interface for players
- **Core** (`src/js/core.js`): Game logic, state machine, and bot behavior
- **Map** (`src/js/map.js`): Level parsing and map management
- **Peers** (`src/js/peers.js`): WebRTC peer connection handling
- **Signalling** (`src/js/signalling.js`): WebSocket signalling for WebRTC negotiation
- **UI** (`src/js/ui.js`): User interface utilities

### Communication Flow

1. Host loads `/index.html` and creates a game with unique ID
2. Remote players load `/remote.html?game=ID`
3. WebRTC negotiation via WebSocket signalling
4. Commands sent peer-to-peer from remotes to host
5. Host processes commands and updates game state

## Tech Stack

### Core Technologies

- **Vanilla JavaScript** (ES modules)
  - No build step required
  - Browser-native module loading (`type="module"`)
  - Modern ES6+ syntax
- **WebRTC** for peer-to-peer connections
- **WebSocket** for signalling during WebRTC negotiation
- **Browser Motion API** for remote control events
- **SVG** for game rendering

### External Dependencies

- `qr-code` library (webcomponent for QR codes)
- `http-server` (dev dependency for local HTTPS serving)

## Code Style and Conventions

### JavaScript

- **Use ES6+ features**: arrow functions, destructuring, async/await
- **Module imports**: Use ES module `import`/`export` syntax
- **Functional patterns**: Prefer pure functions and immutability
- **Event hubs**: Use the `eventHub()` pattern for pub/sub (see `core.js`)
- **State machines**: Use the state machine pattern for complex state (see `core.js`)
- **Naming**:
  - Constants: `PascalCase` for enums (e.g., `Commands.Forwards`)
  - Functions: `camelCase`
  - Files: lowercase with dots for tests (e.g., `core.test.js`)

### Code Organization

- Keep related functionality in focused modules
- Export only what's needed by other modules
- Use named exports, avoid default exports
- Place tests adjacent to implementation files (e.g., `core.js` and `core.test.js`)

## Testing

### Test Framework

Custom lightweight test harness in `src/js/_tests.js` with:
- `describe()` for grouping tests
- `it()` for individual test cases
- `assert()`, `assertEqual()`, `assertThrows()`, `assertThrowsAsync()` for assertions

### Running Tests

Run individual test files directly with Node.js:

```bash
node src/js/core.test.js
node src/js/map.test.js
node src/js/signals.test.js
```

### Writing Tests

```javascript
import { describe, it, assert, assertEqual } from './_tests.js'
import { myFunction } from './mymodule.js'

describe('MyModule', () => {
  describe('myFunction', () => {
    it('does something specific', () => {
      const result = myFunction(input)
      assertEqual(result, expected)
    })
  })
})
```

### Test Coverage

- Write tests for core game logic
- Test state transitions in state machines
- Test edge cases (e.g., bot movement through walls)
- Tests run synchronously and asynchronously as needed

## Development Workflow

### Local Development

Due to Browser Motion API requirements, HTTPS is needed for development:

```bash
# Set your machine's mDNS hostname (e.g., "mymachine.local")
DUMMY_HOSTNAME=<hostname>.local make serve
```

This will:
1. Generate self-signed SSL certificates
2. Start `http-server` with HTTPS
3. Serve the `src/` directory

### File Structure

```
src/
├── index.html        # Host game UI
├── remote.html       # Remote control UI
├── css/              # Stylesheets
│   ├── host.css
│   ├── remote.css
│   ├── controls.css
│   └── tabs.css
└── js/               # JavaScript modules
    ├── _tests.js     # Test harness
    ├── core.js       # Core game logic
    ├── core.test.js  # Core tests
    ├── host.js       # Host entry point
    ├── remote.js     # Remote entry point
    ├── map.js        # Map parsing
    ├── map.test.js   # Map tests
    ├── peers.js      # WebRTC peers
    ├── signalling.js # WebSocket signalling
    ├── signals.js    # Signal processing
    ├── signals.test.js # Signal tests
    └── ui.js         # UI utilities
```

### No Build Step

This project intentionally has no build step:
- Browsers natively load ES modules
- No transpilation needed
- Keep dependencies minimal
- Prioritize web standards and native APIs

## Important Patterns

### State Machine Pattern

The game uses a custom state machine implementation (in `core.js`):

```javascript
const machine = stateMachine({
  initial: 'idle',
  states: {
    idle: {
      events: {
        start: { target: 'running', action: (event) => {} }
      },
      enter: (machine) => {}
    },
    running: {
      // ...
    }
  }
})
```

### Event Hub Pattern

For pub/sub communication:

```javascript
const hub = eventHub('myHub')
const unsubscribe = hub.subscribe((state) => {
  // Handle state update
})
hub.notify(newState)
```

### Async Sequences

Use `Promise.seq()` to run promises sequentially:

```javascript
Promise.seq([
  () => doFirst(),
  () => doSecond(),
  () => doThird()
])
```

## Common Tasks

### Adding a New Command

1. Add to `Commands` enum in `core.js`
2. Implement command handling in bot or interpreter
3. Add UI button in `index.html` and `remote.html`
4. Wire up event handler in `host.js` or `remote.js`
5. Write tests for the new command

### Adding a New Level

1. Create level string in map format (see `map.js` for format)
2. Add to level picker in `host.js`
3. Test map parsing with `map.test.js`

### Modifying WebRTC Behavior

1. Update peer connection logic in `peers.js`
2. Ensure signalling messages are handled in `signalling.js`
3. Test with both host and remote connections

## Best Practices

1. **Keep it simple**: This is a toy project, favor simplicity over complexity
2. **Use web standards**: Prefer native APIs over libraries
3. **Test core logic**: Focus tests on game mechanics and state management
4. **Avoid dependencies**: Only add dependencies when absolutely necessary
5. **Mobile-first**: Remember remotes run on mobile browsers
6. **Peer-to-peer**: No server state, all logic client-side
7. **HTTPS required**: Motion API and WebRTC require secure contexts
