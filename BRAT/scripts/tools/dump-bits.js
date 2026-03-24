"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Cet outil sert à extraire et afficher une séquence de bits brute à partir
 * d'un offset précis dans un fichier .replay, utilisé pour le reverse-engineering.
 */
var fs = require("fs");
var path = require("path");
var brat_parser_lib_1 = require("brat-parser-lib");
var STATE;
(function (STATE) {
    STATE[STATE["INPUTS"] = 1] = "INPUTS";
    STATE[STATE["END"] = 2] = "END";
    STATE[STATE["HEADER"] = 3] = "HEADER";
    STATE[STATE["PLAYER_DATA"] = 4] = "PLAYER_DATA";
    STATE[STATE["FACES_DEATHS"] = 5] = "FACES_DEATHS";
    STATE[STATE["RESULTS"] = 6] = "RESULTS";
    STATE[STATE["FACES_VICTORY"] = 7] = "FACES_VICTORY";
    STATE[STATE["INVALID"] = 8] = "INVALID";
})(STATE || (STATE = {}));
function runDump() {
    var filePath = path.join(__dirname, '../../test-fixtures/[10.04] SmallBrawlhaven.replay');
    var rawBuffer = fs.readFileSync(filePath);
    var decrypted = (0, brat_parser_lib_1.decompressReplayBuffer)(rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength));
    var stream = new brat_parser_lib_1.BitStream(decrypted);
    var version = stream.ReadInt();
    console.log("Replay Version: ".concat(version));
    var stop = false;
    while (stream.getReadBytesAvailable() > 0 && !stop) {
        var state = stream.ReadBits(4);
        if (state === STATE.HEADER) {
            stream.ReadInt(); // randomSeed
            var playlistId = stream.ReadInt();
            if (playlistId !== 0) {
                stream.ReadString(); // playlistName
            }
            stream.ReadBoolean(); // onlineGame
        }
        else if (state === STATE.PLAYER_DATA) {
            // GameSettings
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            stream.ReadInt();
            var levelId = stream.ReadInt();
            var heroCount = stream.ReadShort();
            console.log("LevelId: ".concat(levelId, ", heroCount: ").concat(heroCount));
            while (stream.ReadBoolean()) {
                var entityId = stream.ReadInt();
                var entityName = stream.ReadString();
                console.log("\nFound Entity ID=".concat(entityId, ", Name=\"").concat(entityName, "\""));
                // PlayerDataBlock
                stream.ReadInt(); // colourId
                stream.ReadInt(); // spawnBotId
                stream.ReadInt(); // companionId
                stream.ReadInt(); // emitterId
                stream.ReadInt(); // playerThemeId
                for (var i = 0; i < 8; i++)
                    stream.ReadInt(); // taunts
                stream.ReadShort(); // winTaunt
                stream.ReadShort(); // loseTaunt
                while (stream.ReadBoolean()) {
                    stream.ReadInt(); // ownedTaunts
                }
                stream.ReadShort(); // avatarId
                stream.ReadInt(); // team
                var connectionTime = stream.ReadInt();
                console.log("ConnectionTime = ".concat(connectionTime));
                if (entityId === 2) {
                    console.log("\n--- STARTING FATAL DUMP AT BIT OFFSET ___ (Byte: ".concat(stream.getReadBytesAvailable(), " left) ---"));
                    var bitString = '';
                    for (var i = 0; i < 500; i++) {
                        bitString += stream.ReadBoolean() ? '1' : '0';
                    }
                    dumpAndFormat(bitString);
                    return; // Work is done
                }
                else {
                    // skip 360 bits for entity 1
                    for (var i = 0; i < 360; i++)
                        stream.ReadBoolean();
                }
            }
        }
        else {
            console.log("Reached state ".concat(state, ", stopping."));
            break;
        }
    }
}
function dumpAndFormat(bitString) {
    var output = '';
    for (var i = 0; i < bitString.length; i += 32) {
        var chunk = bitString.substring(i, i + 32).padEnd(32, '0');
        var chunkReversedForVal = chunk.split('').reverse().join('');
        var num = parseInt(chunkReversedForVal, 2);
        var line = "Chunk: ".concat(chunk, " | Reversed: ").concat(chunkReversedForVal, " | Valeur: ").concat(num, " | Hex: 0x").concat(num.toString(16).padStart(8, '0'), "\n");
        console.log(line.trim());
        output += line;
    }
    var outPath = path.join(__dirname, '../../tmp/10_04_mystery_bits.txt');
    fs.mkdirSync(path.join(__dirname, '../../tmp'), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf-8');
    console.log("\n\u2705 Result saved to ".concat(outPath));
}
runDump();
