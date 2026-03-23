const fs = require('fs');
const { execSync } = require('child_process');

const TOKEN = process.env.HF_TOKEN || 'your_hf_token_here';
const SPACE_NAME = 'letxipu-mcp-client-skills';
const TARGET_DIR = 'd:\\OTROS\\letxipu-mcp-client-skills';

async function main() {
    try {
        // 1. Get username
        console.log("Identificando usuario...");
        const whoamiRes = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        if (!whoamiRes.ok) throw new Error("Token inválido o expirado.");
        const whoami = await whoamiRes.json();
        const username = whoami.name;
        console.log(`✅ Autenticado como: ${username}`);

        // 2. Create space
        console.log(`\nCreando Space de Docker: ${username}/${SPACE_NAME}...`);
        const createRes = await fetch("https://huggingface.co/api/repos/create", {
            method: "POST",
            headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "space",
                name: SPACE_NAME,
                sdk: "docker",
                private: false // Hacemos el Space público para que puedan acceder a la web, los secrets igual estarán protegidos.
            })
        });
        
        if (!createRes.ok && createRes.status !== 409) {
            const err = await createRes.text();
            throw new Error(`Failed to create space: ${err}`);
        }
        if (createRes.status === 409) {
            console.log("ℹ️ El Space ya existía, sincronizando...");
        } else {
            console.log("✅ Space creado exitosamente.");
        }

        // 3. Sync Secrets
        console.log("\nSincronizando .env.local a HuggingFace Secrets...");
        try {
            const envContent = fs.readFileSync(`${TARGET_DIR}\\.env.local`, 'utf-8');
            const lines = envContent.split('\n');
            let secretsCount = 0;
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const idx = trimmed.indexOf('=');
                if (idx === -1) continue;
                const key = trimmed.slice(0, idx).trim();
                let value = trimmed.slice(idx + 1).trim();
                
                // Remove surrounding quotes if any
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                console.log(`  - Subiendo secreto: ${key}`);
                await fetch(`https://huggingface.co/api/spaces/${username}/${SPACE_NAME}/secrets`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ key, value, description: "Sincronizado desde .env.local" })
                });
                secretsCount++;
            }
            console.log(`✅ ${secretsCount} Secrets sincronizados.`);
        } catch (e) {
            console.log("⚠️ No se pudo leer .env.local o no hay secrets para subir.");
        }

        // 4. Git Push
        console.log("\nPreparando Git y empujando el código...");
        const remoteUrl = `https://${username}:${TOKEN}@huggingface.co/spaces/${username}/${SPACE_NAME}`;
        
        const execOpts = { cwd: TARGET_DIR, stdio: 'inherit' };
        
        try { 
            execSync('git rev-parse --is-inside-work-tree', { cwd: TARGET_DIR, stdio: 'ignore' }); 
        } catch { 
            execSync('git init', execOpts); 
            // Checkout to main internally if it creates master by default
            try { execSync('git branch -M main', execOpts); } catch {}
        }

        // En HF los tokens a veces fallan si no usamos `git add .` limpios de warnings de salto de linea
        execSync('git add .', execOpts);
        
        try { 
            execSync('git commit -m "🚀 Auto-Deploy to HuggingFace"', execOpts); 
        } catch (e) {
            console.log("Nada nuevo que commitear.");
        }
        
        try { execSync('git remote remove hf', { cwd: TARGET_DIR, stdio: 'ignore' }); } catch {}
        execSync(`git remote add hf ${remoteUrl}`, execOpts);
        
        console.log("⏳ Subiendo todo el código a HuggingFace...");
        execSync('git push -f hf main', execOpts);

        console.log(`\n🎉 PROCESO COMPLETADO!`);
        console.log(`🌐 Tu webapp estará disponible en: https://huggingface.co/spaces/${username}/${SPACE_NAME}`);
    } catch (e) {
        console.error("\n❌ ERROR FATAL:", e.message);
    }
}

main();
