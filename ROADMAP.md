# Plánované featury

## Ukládání rozepsaných vzpomínek (koncepty)

Cíl: když se formulář nové vzpomínky omylem zavře nebo se stránka obnoví, rozepsaný obsah se neztratí.

**Rozsah**
- Jeden koncept pro formulář *nové* vzpomínky (úpravy existující vzpomínky se do konceptu neukládají).
- Ukládá se text, lokace, souřadnice, tagy, datum, čas a fotky.
- Koncept i fotky se ukládají do IndexedDB (`memoryOfflineStore`); fotky zůstávají jako Bloby.

**Chování**
- Automatické ukládání s debounce (~500 ms), bez tlačítka „Uložit koncept“.
- Zavření formuláře koncept zachová bez potvrzovacího dialogu; před zavřením se uloží i změny z posledních 500 ms.
- Koncept se smaže po úspěšném uložení vzpomínky, po potvrzeném „Začít znovu“ a při odhlášení.
- Na hlavní stránce se zobrazí tlačítko pro pokračování v konceptu. Při klepnutí na FAB s existujícím konceptem lze pokračovat, nebo vytvořit novou vzpomínku.
- Vytvoření nové vzpomínky při existujícím konceptu vyžaduje potvrzení jeho nahrazení.

**Technicky**
- IndexedDB store pro koncepty s klíčem vázaným na `user.id`; logout ho maže spolu s ostatními soukromými offline daty.
- Logika v `app/components/memory/MemoryForm.vue` jen pro novou vzpomínku (bez `memoryId`).
- Dialog pro zahození se zobrazuje jen při explicitním zahození nebo nahrazení konceptu. Úpravy existující vzpomínky si zachovávají potvrzení při zavření neuložených změn.

**Nebudeme dělat:** více konceptů najednou se seznamem.
