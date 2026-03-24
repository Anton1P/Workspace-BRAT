import fs from 'fs';
import path from 'path';
import { parseReplay } from '../src/core/parser/replay-reader';

// Since we expose BinaryReader as part of the library or it's accessible internally
// Unfortunately, BinaryReader might not be fully accessible here to get the offset,
// so we'll wrap parseReplay and inject try/catch inside if needed, or just see
// what errors get thrown and patch them.
// Let's at least try the base parsing and catch normal errors.

const replaysDir = path.resolve(__dirname, '../../BRAT/replays');

async function main() {
    const files = fs.readdirSync(replaysDir).filter(f => f.endsWith('.replay'));
    
    console.log(`Found ${files.length} replays to test.\n`);
    
    let successCount = 0;
    
    for (const file of files) {
        const filePath = path.join(replaysDir, file);
        const data = fs.readFileSync(filePath);
        
        // Convert Node Buffer to ArrayBuffer
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        
        try {
            console.log(`[TESTING] ${file}...`);
            const parsed = parseReplay(arrayBuffer);
            const numEntities = parsed.entities.length;
            const numInputs = Object.keys(parsed.inputs).length;

            console.log(`✅ [SUCCESS] ${file}`);
            console.log(`   - Version: ${parsed.version}`);
            console.log(`   - Entities: ${numEntities}`);
            console.log(`   - Inputs: ${numInputs}`);
            successCount++;
        } catch (e: any) {
            console.error(`❌ [FAILED] ${file}`);
            console.error(e);
            if (e.offset !== undefined) {
                 console.error(`   - Offset: ${e.offset}`);
            }
        }
        console.log('-----------------------------------');
    }
    
    console.log(`\nResults: ${successCount}/${files.length} succeeded.`);
}

main().catch(console.error);