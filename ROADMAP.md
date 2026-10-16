# Plánované featury

## Ukládání rozepsaných vzpomínek (koncepty)

Cíl: když se formulář nové vzpomínky omylem zavře nebo se stránka obnoví, rozepsaný obsah se neztratí.

**Rozsah**
- Jeden koncept pro formulář *nové* vzpomínky (úpravy existující vzpomínky se do konceptu neukládají).
- Ukládá se text, lokace, souřadnice, tagy, datum a čas.
- Fotky ve verzi 1 vynechat (`File` objekty nejdou do `localStorage`). Případně později přes IndexedDB (`memoryOfflineStore`).

**Chování**
- Automatické ukládání s debounce (~500 ms), bez tlačítka „Uložit koncept“.
- Koncept se smaže po úspěšném uložení vzpomínky, po explicitním „Zahodit“ a při odhlášení.
- Při otevření formuláře se koncept předvyplní a nahoře se zobrazí štítek „Obnovený koncept z HH:MM“ s tlačítkem „Začít znovu“.
- Na tlačítku pro přidání vzpomínky na hlavní stránce indikátor „Rozepsáno“.

**Technicky**
- `useLocalStorage` z VueUse, klíč vázaný na `user.id`.
- Logika v `app/components/memory/MemoryForm.vue` jen v režimu vytváření (bez `memoryId`).
- Dialog „Zahodit změny?“ v `app/components/modals/MemoryForm.vue` se při automatickém ukládání zobrazí jen pro explicitní zahození.

**Nebudeme dělat:** více konceptů najednou se seznamem.
