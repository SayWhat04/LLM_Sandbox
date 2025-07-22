function stepByStepDecryption() {
    const cipher = "GhUiPj1fKTM3NCY1KSUmNxkP";
    const key = "Andrzej";
    
    console.log("🔍 DESZYFROWANIE KROK PO KROKU");
    console.log("=".repeat(50));
    console.log(`📝 Zaszyfrowany tekst: ${cipher}`);
    console.log(`🔑 Klucz: ${key}`);
    console.log(`💡 Wskazówka: "Krzyżowo, logicznie, algorytmicznie"`);
    console.log();

    // KROK 1: Analiza wskazówki
    console.log("📋 KROK 1: ANALIZA WSKAZÓWKI");
    console.log("-".repeat(30));
    console.log("• 'Krzyżowo' → XOR (exclusive OR) - operacja logiczna");
    console.log("• 'Logicznie' → Operacje na bitach/bajtach");
    console.log("• 'Algorytmicznie' → Standardowy algorytm kryptograficzny");
    console.log("▶️ Wniosek: Prawdopodobnie Base64 + XOR");
    console.log();

    // KROK 2: Rozpoznanie Base64
    console.log("📋 KROK 2: ROZPOZNANIE FORMATU");
    console.log("-".repeat(30));
    console.log(`• Długość: ${cipher.length} znaków`);
    console.log("• Znaki: a-z, A-Z, 0-9, +, /, = (typowe dla Base64)");
    console.log("• Końcówka: ...xkP (brak padding '=', ale to normalne)");
    console.log("▶️ Wniosek: To Base64!");
    console.log();

    // KROK 3: Dekodowanie Base64
    console.log("📋 KROK 3: DEKODOWANIE BASE64");
    console.log("-".repeat(30));
    
    const decoded = Buffer.from(cipher, 'base64');
    console.log(`• Input (Base64): ${cipher}`);
    console.log(`• Output (hex):   ${decoded.toString('hex')}`);
    console.log(`• Output (bytes): [${Array.from(decoded).join(', ')}]`);
    console.log(`• Długość:        ${decoded.length} bajtów`);
    
    // Pokazanie każdego bajtu
    console.log("\n• Szczegółowo:");
    for (let i = 0; i < decoded.length; i++) {
        const byte = decoded[i];
        console.log(`  Bajt ${i.toString().padStart(2)}: ${byte.toString().padStart(3)} (0x${byte.toString(16).padStart(2, '0')}) = '${String.fromCharCode(byte)}'`);
    }
    console.log();

    // KROK 4: Przygotowanie klucza
    console.log("📋 KROK 4: PRZYGOTOWANIE KLUCZA XOR");
    console.log("-".repeat(30));
    const keyBuffer = Buffer.from(key);
    console.log(`• Klucz: "${key}"`);
    console.log(`• Jako bajty: [${Array.from(keyBuffer).join(', ')}]`);
    console.log(`• Jako hex: ${keyBuffer.toString('hex')}`);
    console.log(`• Długość klucza: ${keyBuffer.length} bajtów`);
    
    console.log("\n• Mapowanie klucza na alfabet:");
    for (let i = 0; i < keyBuffer.length; i++) {
        const byte = keyBuffer[i];
        console.log(`  '${key[i]}' → ${byte} (0x${byte.toString(16)})`);
    }
    console.log();

    // KROK 5: Operacja XOR
    console.log("📋 KROK 5: OPERACJA XOR");
    console.log("-".repeat(30));
    console.log("XOR (exclusive OR) działa tak:");
    console.log("• 0 XOR 0 = 0");
    console.log("• 0 XOR 1 = 1");  
    console.log("• 1 XOR 0 = 1");
    console.log("• 1 XOR 1 = 0");
    console.log();
    
    const result = Buffer.alloc(decoded.length);
    
    console.log("• Krok po kroku XOR każdego bajtu:");
    for (let i = 0; i < decoded.length; i++) {
        const dataByte = decoded[i];
        const keyByte = keyBuffer[i % keyBuffer.length];
        const xorResult = dataByte ^ keyByte;
        result[i] = xorResult;
        
        const keyChar = key[i % key.length];
        const resultChar = String.fromCharCode(xorResult);
        
        console.log(`  Bajt ${i.toString().padStart(2)}: ${dataByte.toString().padStart(3)} XOR ${keyByte.toString().padStart(3)} ('${keyChar}') = ${xorResult.toString().padStart(3)} → '${resultChar}'`);
        console.log(`           0x${dataByte.toString(16).padStart(2,'0')} XOR 0x${keyByte.toString(16).padStart(2,'0')} = 0x${xorResult.toString(16).padStart(2,'0')}`);
    }
    console.log();

    // KROK 6: Wynik końcowy
    console.log("📋 KROK 6: WYNIK KOŃCOWY");
    console.log("-".repeat(30));
    const finalText = result.toString('utf8');
    console.log(`• Bajty wynikowe: [${Array.from(result).join(', ')}]`);
    console.log(`• Hex: ${result.toString('hex')}`);
    console.log(`• Jako tekst: "${finalText}"`);
    console.log();

    // KROK 7: Weryfikacja
    console.log("📋 KROK 7: WERYFIKACJA");
    console.log("-".repeat(30));
    console.log("• Format wyniku: [{FLG:...}} - typowy format flagi CTF");
    console.log("• Zawartość: 'CrYPTOLOgY' - nawiązanie do kryptografii");
    console.log("• Wszystko się zgadza! ✅");
    console.log();

    console.log("🎉 PODSUMOWANIE");
    console.log("=".repeat(50));
    console.log(`🔐 Zaszyfrowany tekst: ${cipher}`);
    console.log(`🔑 Klucz: ${key}`);
    console.log(`🎯 Odszyfrowany tekst: ${finalText}`);
    console.log();
    console.log("📝 Algorytm: Base64 → XOR z kluczem");
    console.log("💡 Wskazówka była kluczem do zrozumienia metody!");
}

stepByStepDecryption(); 