import * as crypto from 'crypto';

function decodeBase64Variants(text: string): Record<string, Buffer | null> {
    const results: Record<string, Buffer | null> = {};
    
    try {
        // Standard Base64
        results['Standard Base64'] = Buffer.from(text, 'base64');
    } catch (e) {
        results['Standard Base64'] = null;
    }
    
    try {
        // Add padding and try again
        const padded = text + '==';
        results['Base64 with padding'] = Buffer.from(padded, 'base64');
    } catch (e) {
        results['Base64 with padding'] = null;
    }
    
    try {
        // URL-safe Base64 (replace - with + and _ with /)
        const urlSafe = text.replace(/-/g, '+').replace(/_/g, '/');
        results['URL-safe Base64'] = Buffer.from(urlSafe, 'base64');
    } catch (e) {
        results['URL-safe Base64'] = null;
    }
    
    return results;
}

function vigenereDecrypt(ciphertext: string, key: string): string {
    let result = "";
    const keyUpper = key.toUpperCase();
    let keyIndex = 0;
    
    for (let i = 0; i < ciphertext.length; i++) {
        const char = ciphertext[i];
        
        if (/[A-Za-z]/.test(char)) {
            const keyChar = keyUpper[keyIndex % keyUpper.length];
            const keyShift = keyChar.charCodeAt(0) - 'A'.charCodeAt(0);
            
            if (char >= 'A' && char <= 'Z') {
                const charCode = char.charCodeAt(0) - 'A'.charCodeAt(0);
                const decrypted = (charCode - keyShift + 26) % 26;
                result += String.fromCharCode(decrypted + 'A'.charCodeAt(0));
            } else {
                const charCode = char.charCodeAt(0) - 'a'.charCodeAt(0);
                const decrypted = (charCode - keyShift + 26) % 26;
                result += String.fromCharCode(decrypted + 'a'.charCodeAt(0));
            }
            keyIndex++;
        } else {
            result += char;
        }
    }
    
    return result;
}

function xorDecrypt(data: Buffer, key: string): Buffer {
    const keyBuffer = Buffer.from(key);
    const result = Buffer.alloc(data.length);
    
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return result;
}

function analyzeCipher() {
    const cipher = "GhUiPj1fKTM3NCY1KSUmNxkP";
    const key = "Andrzej";
    
    console.log("=== ANALIZA SZYFRU ===");
    console.log(`Tekst zaszyfrowany: ${cipher}`);
    console.log(`Klucz: ${key}`);
    console.log(`Długość tekstu: ${cipher.length}`);
    console.log(`Wskazówka: Krzyżowo, logicznie, algorytmicznie`);
    console.log();
    
    console.log("=== PRÓBA 1: Base64 Variants ===");
    const base64Results = decodeBase64Variants(cipher);
    for (const [variant, result] of Object.entries(base64Results)) {
        if (result) {
            console.log(`${variant}: ${result.toString('hex')}`);
            try {
                const text = result.toString('utf8');
                console.log(`  -> Jako tekst: ${text}`);
            } catch (e) {
                console.log(`  -> Nie można zdekodować jako tekst UTF-8`);
            }
        } else {
            console.log(`${variant}: Błąd dekodowania`);
        }
        console.log();
    }
    
    console.log("=== PRÓBA 2: Vigenère Cipher ===");
    const vigenereResult = vigenereDecrypt(cipher, key);
    console.log(`Vigenère z kluczem '${key}': ${vigenereResult}`);
    console.log();
    
    console.log("=== PRÓBA 3: XOR z Base64 ===");
    for (const [variant, decoded] of Object.entries(base64Results)) {
        if (decoded) {
            try {
                const xorResult = xorDecrypt(decoded, key);
                console.log(`XOR po ${variant}:`);
                console.log(`  -> Hex: ${xorResult.toString('hex')}`);
                try {
                    const text = xorResult.toString('utf8');
                    console.log(`  -> Jako tekst: ${text}`);
                } catch (e) {
                    console.log(`  -> Nie można zdekodować jako tekst UTF-8`);
                }
            } catch (e) {
                console.log(`Błąd XOR po ${variant}: ${e}`);
            }
            console.log();
        }
    }
    
    console.log("=== PRÓBA 4: Hex Analysis ===");
    try {
        const hexDecoded = Buffer.from(cipher, 'hex');
        console.log(`Jako hex: ${hexDecoded.toString('hex')}`);
        const xorResult = xorDecrypt(hexDecoded, key);
        console.log(`XOR hex z kluczem: ${xorResult.toString('hex')}`);
        try {
            console.log(`  -> Jako tekst: ${xorResult.toString('utf8')}`);
        } catch (e) {
            console.log(`  -> Nie można zdekodować jako tekst UTF-8`);
        }
    } catch (e) {
        console.log("Nie jest poprawnym hex");
    }
    
    console.log();
    console.log("=== PRÓBA 5: Analiza znaków specjalnych ===");
    console.log("Sprawdzenie każdego znaku...");
    for (let i = 0; i < cipher.length; i++) {
        const char = cipher[i];
        console.log(`  '${char}' -> ASCII: ${char.charCodeAt(0)}, Hex: 0x${char.charCodeAt(0).toString(16)}`);
    }
    
    console.log();
    console.log("=== PRÓBA 6: Odwrotny Vigenère (szyfrowanie zamiast deszyfrowania) ===");
    const reverseVigenere = vigenereEncrypt(cipher, key);
    console.log(`Odwrotny Vigenère: ${reverseVigenere}`);
}

function vigenereEncrypt(plaintext: string, key: string): string {
    let result = "";
    const keyUpper = key.toUpperCase();
    let keyIndex = 0;
    
    for (let i = 0; i < plaintext.length; i++) {
        const char = plaintext[i];
        
        if (/[A-Za-z]/.test(char)) {
            const keyChar = keyUpper[keyIndex % keyUpper.length];
            const keyShift = keyChar.charCodeAt(0) - 'A'.charCodeAt(0);
            
            if (char >= 'A' && char <= 'Z') {
                const charCode = char.charCodeAt(0) - 'A'.charCodeAt(0);
                const encrypted = (charCode + keyShift) % 26;
                result += String.fromCharCode(encrypted + 'A'.charCodeAt(0));
            } else {
                const charCode = char.charCodeAt(0) - 'a'.charCodeAt(0);
                const encrypted = (charCode + keyShift) % 26;
                result += String.fromCharCode(encrypted + 'a'.charCodeAt(0));
            }
            keyIndex++;
        } else {
            result += char;
        }
    }
    
    return result;
}

analyzeCipher(); 