# AllKidz Planning (demo)

Een planningsapp voor AllKidz, gebouwd als opdracht in een sollicitatie. Een planner plant diensten voor KidzCoaches op kinderopvanglocaties, scholen en zwembaden, en ziet direct wat er misgaat: iemand die op twee plekken tegelijk staat, te weinig reistijd heeft tussen locaties, of ingepland is terwijl hij of zij niet beschikbaar is.

**Live demo:** https://allkidz.luukvandijk.com (de inloggegevens zijn apart gestuurd). Elke login krijgt een eigen, schone kopie van de fictieve testdata, dus wat je verandert ziet niemand anders.

## Wat de app doet

De vier onderdelen uit de opdracht:

- **Diensten aanmaken en herhalen:** medewerker, locatie, tijden en functie; eenmalig, op losse datums (kalender) of als patroon (elke week, om de week, de derde vrijdag van de maand). Elke datum die daaruit voortkomt wordt vóór het opslaan op conflicten gecontroleerd, en datums in het verleden kun je niet kiezen.
- **Dagoverzicht per medewerker:** de hele dag op tijdsvolgorde, met de overstap tussen diensten ("10 min, reistijd 25 min"). Conflicten: overlap, te weinig reistijd, niet beschikbaar en verkeerde functie, elk uitgelegd in gewone taal. Een tussenpauze die precies gelijk is aan de reistijd staat er als "krap", niet als conflict.
- **Zoeken en filteren** over alle 293 diensten: op dag, medewerker, locatie, functie, alleen conflicten of alleen open diensten. Het filteren gebeurt in de browser op data die al geladen is, dus het werkt direct; de filters staan in de URL.
- **Wijzigingslog:** wie, wanneer, wat (voor en na) en waarom. Bij elke verwijdering is een reden verplicht. Het log kan alleen worden aangevuld, nooit aangepast; dat dwingt de database af.

Daarbovenop:

- **Dashboard** voor deze en volgende week: diensten en bezetting, open diensten, conflicten, aanvragen, licenties en tassen. Elk getal linkt naar de plek waar je er iets mee kunt doen.
- **Planbord** met dag-, lijst-, week- en maandweergave. In de dagweergave krijgen medewerkers met een conflict een eigen blok, en "Iemand anders" stelt voor wie een dienst kan overnemen zonder nieuw conflict.
- **Iemand voorstellen** voor een open dienst: juiste functie, geldige licenties, beschikbaar, geen overlap, genoeg reistijd, en wie die week de minste uren heeft eerst.
- **Automatisch bericht aan de opdrachtgever** bij wijzigingen binnen de meldingstermijn (standaard 7 dagen, instelbaar), zonder de privéreden.
- **Webapp voor medewerkers** (app-indeling op de telefoon, gewone pagina op de laptop): eigen diensten, niet-beschikbaarheid doorgeven, passende open diensten aannemen, afmelden met een reden.
- **Medewerkerpagina voor de planner:** uren per week, conflicten, komende diensten, licenties en recente wijzigingen.
- **Uit de functielijst van AllKidz:** licenties met vervaldatum (verplicht per type locatie), een portaal voor opdrachtgevers (planning per locatie, dienstaanvragen, locaties, coachprofielen zonder achternaam of BSN) en sporttassen (een tas blijft een dag bij één coach; twee coaches met dezelfde tas is een conflict; wat er mist meldt de medewerker vanuit de app).

Met "Bekijk als" bovenin wissel je van rol: planner, een medewerker of een opdrachtgever.

## Techniek

- [Next.js 16](https://nextjs.org) (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS v4 en shadcn/ui op Base UI
- [Supabase](https://supabase.com): Postgres met Row Level Security, anoniem inloggen per demo-login
- Resend voor de optionele echte e-mail van een bericht aan de opdrachtgever
- Vitest voor unit-tests, Playwright voor end-to-end-tests

## Hoe het is opgebouwd

- **De planningslogica is gewone TypeScript in `src/lib/`**, zonder React of database. Daardoor is ze snel en volledig met unit-tests gedekt. De conflictcontrole staat in `src/lib/conflicts/`.
- **Pagina's laden de hele werkomgeving in één keer** (ongeveer 300 diensten) en filteren en zoeken conflicten in het geheugen.
- **Wijzigingen lopen via server actions** in `src/app/actions/`. Die controleren de invoer op de server nog een keer, schrijven het wijzigingslog en sturen het bericht aan de opdrachtgever als een wijziging binnen de meldingstermijn valt.
- **Elke demo-login is een anonieme Supabase-gebruiker met een eigen werkomgeving.** Row Level Security beperkt elke tabel tot die werkomgeving. De functie die een werkomgeving aanmaakt geeft de bestaande terug als je hem nog eens aanroept, zodat niemand de database kan volschrijven door hem in een lus aan te roepen. Werkomgevingen worden na 7 dagen automatisch opgeruimd.

```
src/
  app/              pagina's (planbord, dashboard, aanvragen, tassen, medewerkers, log, ...) en server actions
  components/       schermen per onderdeel (planbord, dienstformulier, medewerker-app, opdrachtgeversportaal, tassen, dashboard)
  lib/
    conflicts/      conflictcontrole: overlap, reistijd, niet beschikbaar, functie, licentie, tas
    recurrence.ts   losse datums en patronen
    filters.ts      filters in de URL
    suggest.ts      rangorde van geschikte medewerkers
    dashboard.ts    cijfers voor het dashboard
    data/           laden uit Supabase
supabase/migrations/  databaseschema, Row Level Security, testdata
scripts/            import van de testdata en de zelfgemaakte aanvulling
tests/              unit-tests (Vitest)
e2e/                end-to-end-tests (Playwright)
```

## Testdata

- `data/source/Testdata-planning-app.xlsx` is de aangeleverde fictieve testdata (293 diensten in de week van 19 tot en met 23 oktober 2026, 40 medewerkers, 28 locaties). `scripts/import_testdata.py` zet die om naar de JSON die de tests gebruiken en naar de SQL voor de database.
- De aangeleverde data bevat geen licenties, opdrachtgevers of tassen. `data/aanvullende-testdata.json` is een **zelfgemaakte, fictieve** aanvulling. Die wordt gemaakt door `scripts/make_extra_testdata.py`, los gecontroleerd door `scripts/analyze_extra.py` en omgezet naar SQL door `scripts/seed_extra_sql.py`.

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul de Supabase-URL en publishable key in, de demo-login en eventueel een Resend-key
npm run dev
```

Voer de migraties in `supabase/migrations/` op volgorde uit in een Supabase-project waarin anoniem inloggen aan staat.

## Tests

```bash
npm test            # unit-tests
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run e2e         # end-to-end-tests tegen de ontwikkelserver
```

Bij de unit-tests zitten twee "gouden tests" over de volledige dataset. De eerste controleert dat de app precies de 15 bekende conflicten in de aangeleverde data vindt, en geen van de gevallen die er alleen op lijken: een pauze die precies gelijk is aan de reistijd, twee diensten direct na elkaar op dezelfde locatie, een dienst die precies eindigt als de niet-beschikbaarheid begint, en open diensten. De tweede voegt de zelfgemaakte data toe: 15 + 4 licentieconflicten + 1 dubbel geboekte tas, met eigen valkuilen, zoals een licentie die op de dag van de dienst verloopt of dezelfde coach die één tas twee keer gebruikt.

De end-to-end-tests zijn het betrouwbaarst één voor één (`npm run e2e -- --workers=1`) of tegen een productiebuild. Op de ontwikkelserver kan het eerste keer laden van een pagina in de ene test een pagina in een parallelle test herladen.

## Bekende beperkingen

- Rollen wissel je binnen de demo ("Bekijk als"); er zijn nog geen aparte accounts per rol.
- Conflicten worden in de browser berekend voor de geladen data. Voor honderden diensten is dat prima; voor een heel jaar zou dat per week naar de server gaan.
- Nog niet gebouwd: pushmeldingen, diensten ruilen, urenregistratie en facturatie.
