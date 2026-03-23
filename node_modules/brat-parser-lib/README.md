# BRAT Parser (Brawlhalla Replay Reader)

A standalone, reverse-engineered TypeScript parser for Brawlhalla `.replay` files. 

**Compatible with Patch 10.04+**

This parser features a robust **dynamic Anchor Scanner** designed to handle undocumented binary gaps and the removal of the traditional footer version checks introduced in patch 10.04. It correctly processes asynchronous cosmetic entity sizes (Bots vs Human players) without manual byte overrides.

## Installation

```bash
npm install brat-parser-lib
```

## Usage

```typescript
import { parseReplay } from 'brat-parser-lib';
import * as fs from 'fs';

const rawBuffer = fs.readFileSync('path/to/my.replay');
const replayData = parseReplay(rawBuffer);
console.log('Players:', replayData.entities);
```
