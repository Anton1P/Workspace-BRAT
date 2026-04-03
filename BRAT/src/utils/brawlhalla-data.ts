export interface LegendData {
  name: string;
  thumbnailUrl: string;
  weapon1: string; // Ex: 'Sword'
  weapon2: string; // Ex: 'Hammer'
}

export function getLegendThumbnail(name: string): string {
  // Enleve les accents (Bödvar -> Bodvar), enlève les espaces et passe en minuscules
  const formattedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  return `/assets/legends/avatars/${formattedName}.png`;
}

export function getWeaponThumbnail(weaponName: string): string {
  const formattedName = weaponName.replace(/\s+/g, ""); // "Battle Boots" -> "BattleBoots"
  return `/assets/weapons/${formattedName}.png`;
}

export const LegendMap: Record<number, LegendData> = {
  1: { name: 'Bödvar', thumbnailUrl: getLegendThumbnail('Bödvar'), weapon1: 'Sword', weapon2: 'Hammer' },
  28: { name: 'Gnash', thumbnailUrl: getLegendThumbnail('Gnash'), weapon1: 'Hammer', weapon2: 'Spear' },
  96: { name: 'Koji', thumbnailUrl: getLegendThumbnail('Koji'), weapon1: 'Bow', weapon2: 'Sword' },
  32: { name: 'Mirage', thumbnailUrl: getLegendThumbnail('Mirage'), weapon1: 'Scythe', weapon2: 'Spear' },
  116: { name: 'Wu Shang', thumbnailUrl: getLegendThumbnail('Wu Shang'), weapon1: 'Gauntlets', weapon2: 'Spear' },
  1001: { name: 'Cassidy', thumbnailUrl: getLegendThumbnail('Cassidy'), weapon1: 'Blasters', weapon2: 'Hammer' },
  1002: { name: 'Orion', thumbnailUrl: getLegendThumbnail('Orion'), weapon1: 'RocketLance', weapon2: 'Spear' },
  1003: { name: 'Lord Vraxx', thumbnailUrl: getLegendThumbnail('Lord Vraxx'), weapon1: 'Blasters', weapon2: 'RocketLance' },
  1004: { name: 'Queen Nai', thumbnailUrl: getLegendThumbnail('Queen Nai'), weapon1: 'Spear', weapon2: 'Katars' },
  1005: { name: 'Hattori', thumbnailUrl: getLegendThumbnail('Hattori'), weapon1: 'Sword', weapon2: 'Spear' },
  1006: { name: 'Sir Roland', thumbnailUrl: getLegendThumbnail('Sir Roland'), weapon1: 'Sword', weapon2: 'RocketLance' },
  1007: { name: 'Scarlet', thumbnailUrl: getLegendThumbnail('Scarlet'), weapon1: 'Hammer', weapon2: 'RocketLance' },
  1008: { name: 'Thatch', thumbnailUrl: getLegendThumbnail('Thatch'), weapon1: 'Blasters', weapon2: 'Sword' },
  1009: { name: 'Ada', thumbnailUrl: getLegendThumbnail('Ada'), weapon1: 'Blasters', weapon2: 'Spear' },
  1010: { name: 'Sentinel', thumbnailUrl: getLegendThumbnail('Sentinel'), weapon1: 'Hammer', weapon2: 'Katars' },
  1011: { name: 'Lucien', thumbnailUrl: getLegendThumbnail('Lucien'), weapon1: 'Blasters', weapon2: 'Katars' },
  1012: { name: 'Teros', thumbnailUrl: getLegendThumbnail('Teros'), weapon1: 'Axe', weapon2: 'Hammer' },
  1013: { name: 'Brynn', thumbnailUrl: getLegendThumbnail('Brynn'), weapon1: 'Axe', weapon2: 'Spear' },
  1014: { name: 'Asuri', thumbnailUrl: getLegendThumbnail('Asuri'), weapon1: 'Sword', weapon2: 'Katars' },
  1015: { name: 'Barraza', thumbnailUrl: getLegendThumbnail('Barraza'), weapon1: 'Axe', weapon2: 'Blasters' },
  1016: { name: 'Ember', thumbnailUrl: getLegendThumbnail('Ember'), weapon1: 'Bow', weapon2: 'Katars' },
  1017: { name: 'Azoth', thumbnailUrl: getLegendThumbnail('Azoth'), weapon1: 'Bow', weapon2: 'Axe' },
  1018: { name: 'Ulgrim', thumbnailUrl: getLegendThumbnail('Ulgrim'), weapon1: 'Axe', weapon2: 'RocketLance' },
  1019: { name: 'Diana', thumbnailUrl: getLegendThumbnail('Diana'), weapon1: 'Blasters', weapon2: 'Bow' },
  1020: { name: 'Jhala', thumbnailUrl: getLegendThumbnail('Jhala'), weapon1: 'Sword', weapon2: 'Axe' },
  1021: { name: 'Kor', thumbnailUrl: getLegendThumbnail('Kor'), weapon1: 'Gauntlets', weapon2: 'Hammer' },
  1022: { name: 'Val', thumbnailUrl: getLegendThumbnail('Val'), weapon1: 'Gauntlets', weapon2: 'Sword' },
  1023: { name: 'Cross', thumbnailUrl: getLegendThumbnail('Cross'), weapon1: 'Blasters', weapon2: 'Gauntlets' },
  1024: { name: 'Nix', thumbnailUrl: getLegendThumbnail('Nix'), weapon1: 'Blasters', weapon2: 'Scythe' },
  1025: { name: 'Mordex', thumbnailUrl: getLegendThumbnail('Mordex'), weapon1: 'Scythe', weapon2: 'Gauntlets' },
  1026: { name: 'Yumiko', thumbnailUrl: getLegendThumbnail('Yumiko'), weapon1: 'Bow', weapon2: 'Hammer' },
  1027: { name: 'Artemis', thumbnailUrl: getLegendThumbnail('Artemis'), weapon1: 'RocketLance', weapon2: 'Scythe' },
  1028: { name: 'Caspian', thumbnailUrl: getLegendThumbnail('Caspian'), weapon1: 'Katars', weapon2: 'Gauntlets' },
  1029: { name: 'Sidra', thumbnailUrl: getLegendThumbnail('Sidra'), weapon1: 'Sword', weapon2: 'Cannon' },
  1030: { name: 'Xull', thumbnailUrl: getLegendThumbnail('Xull'), weapon1: 'Axe', weapon2: 'Cannon' },
  1031: { name: 'Kaya', thumbnailUrl: getLegendThumbnail('Kaya'), weapon1: 'Bow', weapon2: 'Spear' },
  1032: { name: 'Isaiah', thumbnailUrl: getLegendThumbnail('Isaiah'), weapon1: 'Cannon', weapon2: 'Blasters' },
  1033: { name: 'Jiro', thumbnailUrl: getLegendThumbnail('Jiro'), weapon1: 'Sword', weapon2: 'Scythe' },
  1034: { name: 'Lin Fei', thumbnailUrl: getLegendThumbnail('Lin Fei'), weapon1: 'Katars', weapon2: 'Cannon' },
  1035: { name: 'Zariel', thumbnailUrl: getLegendThumbnail('Zariel'), weapon1: 'Bow', weapon2: 'Gauntlets' },
  1036: { name: 'Rayman', thumbnailUrl: getLegendThumbnail('Rayman'), weapon1: 'Gauntlets', weapon2: 'Axe' },
  1037: { name: 'Dusk', thumbnailUrl: getLegendThumbnail('Dusk'), weapon1: 'Spear', weapon2: 'Orb' },
  1038: { name: 'Fait', thumbnailUrl: getLegendThumbnail('Fait'), weapon1: 'Scythe', weapon2: 'Orb' },
  1039: { name: 'Thor', thumbnailUrl: getLegendThumbnail('Thor'), weapon1: 'Hammer', weapon2: 'Orb' },
  1040: { name: 'Petra', thumbnailUrl: getLegendThumbnail('Petra'), weapon1: 'Gauntlets', weapon2: 'Orb' },
  1041: { name: 'Vector', thumbnailUrl: getLegendThumbnail('Vector'), weapon1: 'RocketLance', weapon2: 'Bow' },
  1042: { name: 'Volkov', thumbnailUrl: getLegendThumbnail('Volkov'), weapon1: 'Axe', weapon2: 'Scythe' },
  1043: { name: 'Onyx', thumbnailUrl: getLegendThumbnail('Onyx'), weapon1: 'Gauntlets', weapon2: 'Cannon' },
  1044: { name: 'Jaeyun', thumbnailUrl: getLegendThumbnail('Jaeyun'), weapon1: 'Sword', weapon2: 'Greatsword' },
  1045: { name: 'Mako', thumbnailUrl: getLegendThumbnail('Mako'), weapon1: 'Katars', weapon2: 'Greatsword' },
  1046: { name: 'Magyar', thumbnailUrl: getLegendThumbnail('Magyar'), weapon1: 'RocketLance', weapon2: 'Greatsword' },
  1047: { name: 'Reno', thumbnailUrl: getLegendThumbnail('Reno'), weapon1: 'Blasters', weapon2: 'Orb' },
  1048: { name: 'Munin', thumbnailUrl: getLegendThumbnail('Munin'), weapon1: 'Bow', weapon2: 'Scythe' },
  1049: { name: 'Arcadia', thumbnailUrl: getLegendThumbnail('Arcadia'), weapon1: 'Spear', weapon2: 'Greatsword' },
  1050: { name: 'Ezio', thumbnailUrl: getLegendThumbnail('Ezio'), weapon1: 'Sword', weapon2: 'Orb' },
  1051: { name: 'Tezca', thumbnailUrl: getLegendThumbnail('Tezca'), weapon1: 'Gauntlets', weapon2: 'BattleBoots' },
  1052: { name: 'Thea', thumbnailUrl: getLegendThumbnail('Thea'), weapon1: 'BattleBoots', weapon2: 'RocketLance' },
  1053: { name: 'Red Raptor', thumbnailUrl: getLegendThumbnail('Red Raptor'), weapon1: 'BattleBoots', weapon2: 'Orb' },
  1054: { name: 'Loki', thumbnailUrl: getLegendThumbnail('Loki'), weapon1: 'Scythe', weapon2: 'Katars' },
  1055: { name: 'Seven', thumbnailUrl: getLegendThumbnail('Seven'), weapon1: 'Spear', weapon2: 'Cannon' },
  1056: { name: 'Vivi', thumbnailUrl: getLegendThumbnail('Vivi'), weapon1: 'Blasters', weapon2: 'BattleBoots' },
  1057: { name: 'King Arthur', thumbnailUrl: getLegendThumbnail('King Arthur'), weapon1: 'Sword', weapon2: 'BattleBoots' }
};

export interface StanceData {
  name: string;
  color: string;
  iconUrl?: string;
}

export const StanceMap: Record<number, StanceData> = {
  1: { name: 'Base', color: '#cbd5e1' }, // Default
  2: { name: 'Force', color: '#ef4444' }, // Red
  3: { name: 'Dexterity', color: '#f59e0b' }, // Orange
  4: { name: 'Defense', color: '#3b82f6' }, // Blue
  5: { name: 'Speed', color: '#10b981' } // Green
};
