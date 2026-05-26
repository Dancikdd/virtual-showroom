// ══════════════════════════════════════════════════════════════
//  ROOM CONFIG — toate ușile
// ══════════════════════════════════════════════════════════════

import { config as floor1door1 } from '../rooms/floor1-door1/floor1-door1.config.js';
import { config as floor1door2 } from '../rooms/floor1-door2/floor1-door2.config.js';
import { config as floor1door3 } from '../rooms/floor1-door3/floor1-door3.config.js';
import { config as floor1door4 } from '../rooms/floor1-door4/floor1-door4.config.js';

import { config as floor2door1 } from '../rooms/floor2-door1/floor2-door1.config.js';
import { config as floor2door2 } from '../rooms/floor2-door2/floor2-door2.config.js';

// ⚔️ EXCALIBUR IMPORTS
import { SwordEnvironment } from '../rooms/floor2-door2/floor2-door2.environment.js';
import { SwordLights } from '../rooms/floor2-door2/floor2-door2.lights.js';
import { SwordControls } from '../rooms/floor2-door2/floor2-door2.swordControls.js';

export const ROOM_CONFIG = {
  'floor1_door_001': floor1door1,
  'floor1_door_002': floor1door2,
  'floor1_door_003': floor1door3,
  'floor1_door_004': floor1door4,
  'floor1_door_005': { label: 'Produs 5',  color: 0x44aaff, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor1_door_006': { label: 'Produs 6',  color: 0xffff44, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor1_door_007': { label: 'Produs 7',  color: 0xff4444, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor1_door_008': { label: 'Produs 8',  color: 0x44ff44, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },

  'floor2_door_001': floor2door1,

  // ⚔️ EXCALIBUR ROOM
  'floor2_door_004': {
    ...floor2door2,

    Environment: SwordEnvironment,
    Lights: SwordLights,
    Controls: SwordControls,
  },

  'floor2_door_003': { label: 'Produs 11', color: 0x44ffcc, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor2_door_005': { label: 'Produs 13', color: 0x2266ff, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor2_door_006': { label: 'Produs 14', color: 0xffee22, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor2_door_007': { label: 'Produs 15', color: 0xff2222, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
  'floor2_door_008': { label: 'Produs 16', color: 0x22ff22, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate', showGalaxy: false },
};