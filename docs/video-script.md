# Videoscript (max 10 minuten, doel 9)

Tip: neem op met Loom, scherm + gezicht. Begin met een verse login, zodat je met de originele testdata werkt. Houd een tweede tabblad klaar met je inbox (voor de echte e-mail).

## 0:00 Intro en keuzes (1 min)

- "Ik ben Luuk. Ik heb een week de tijd gehad en ik heb gekozen om Sanne's vier problemen op te lossen, niet om zoveel mogelijk van de functielijst te bouwen."
- Laat de vier problemen kort zien: dubbel plannen en reistijd, vaste inzet, wijzigingen, medewerkers.
- Bewust niet gebouwd: uren en facturatie, documenten en BSN, ruilen van diensten, echte accounts per rol. Waarom: de kern moet eerst kloppen, zonder valse meldingen.

## 1:00 Inloggen en de sandbox (0:45)

- Log in. "Iedere keer dat je inlogt krijg je een eigen kopie van de testdata. Jullie kunnen dus allemaal tegelijk klikken zonder elkaars demo te breken. Dat is Row Level Security in de database, niet alleen in de app."
- Wijs op "Bekijk als": planner, medewerker, opdrachtgever.

## 1:45 Dagoverzicht en conflicten (1:45)

- Maandag: Tom staat op twee plekken tegelijk (D105 en D176). Noor heeft 10 minuten tussen TSO Het Palet en BSO De Duinroos terwijl dat 25 minuten rijden is. Daan staat ingepland terwijl hij de hele dag niet kan.
- "Elke melding staat er in gewone taal bij, dus Sanne hoeft niet te zoeken wat er mis is."
- Vrijdag, Gijs: "20 minuten tussen twee diensten, reistijd 20 minuten. Dat is krap, maar geen conflict. Dus oranje, niet rood." Hier zitten de valkuilen uit de testdata.
- Vertel: "Ik heb de testdata eerst zelf met een script doorgerekend: 15 echte conflicten. Dat staat als test in de code: de app moet precies die 15 vinden en geen enkele valse. Ook de vier gevallen die op een conflict lijken."
- Benoem de vierde soort: verkeerde functie (Lars als zwemonderwijzer). "Stond niet in de opdracht, wel in de data."

## 3:30 Overzicht bij veel data (1 min)

- Klik "Alleen conflicten (24)": alle conflicten van de week in een keer. Klik "Alleen open".
- Zoek "kompas", filter op een medewerker: uren per dag, week en maand.
- Wissel naar Week (iedereen naast elkaar, uren per week) en Maand. "Filters staan in de URL, dus je kunt een gefilterd overzicht delen of verversen."

## 4:30 Dienst aanmaken met herhaling (1:15)

- Nieuwe dienst: Fleur, KDV Kleine Kei, 07:30-17:00, Patroon, "elke derde vrijdag", november t/m december.
- "Je ziet direct welke datums eruit komen, 20 november en 18 december, en per datum of er een conflict is. Pas daarna sla je op."
- Laat zien: kies iemand die al ingepland staat, de controle wordt rood en de knop wordt "Toch opslaan". "Soms weet de planner meer dan het systeem, dus het mag, maar bewust."
- Spring naar Maand november: de dienst staat er.

## 5:45 Wijziging, log en bericht (1:30)

- Vrijdag D041: Hana eraf halen. Reden is verplicht. "Deze dienst is binnen 7 dagen, dus TSO De Brug krijgt automatisch dit bericht. De reden (ziek) gaat bewust niet naar de opdrachtgever, dat is privacy."
- Wijzigingslog: wie, wanneer, wat, waarom. "Dit log kan niet worden aangepast of verwijderd, ook niet door de planner. Dat dwingt de database af."
- Berichten: "Stuur ook naar mij": laat de echte e-mail binnenkomen in je inbox.
- Instellingen: "De grens van 7 dagen hebben jullie nog niet bepaald, dus hij is instelbaar."

## 7:15 De medewerker op de telefoon (1 min)

- Bekijk als Noor (telefoonformaat): haar diensten per dag, week en maand, met de reistijdmelding. Open diensten: alleen KidzCoach en alleen diensten die in haar rooster passen. Neem er een aan.
- Terug naar het planbord: Noor staat erop, en het log zegt "Noor, via medewerker-app, nam open dienst aan".
- Kort: beschikbaarheid doorgeven en afmelden met reden.

## 8:15 Extra: wie kan deze open dienst doen? (0:30)

- Op een open dienst: "Stel iemand voor". Zelfde conflictregels, minste uren deze week eerst. Bij D230 (toezichthouder): niemand past. "Dat is ook informatie: tijd om te bellen."

## 8:45 Hoe ik AI gebruikte, en wat met meer tijd (1 min)

- "Ik heb met Claude Code gewerkt: eerst samen een ontwerp, dan de logica met tests, dan pas de schermen. Ik stuurde en controleerde: de verwachte conflicten kwamen uit mijn eigen analyse, niet uit de code zelf." Noem een of twee correcties uit de toelichting.
- Met meer tijd: echte accounts per rol (planner, medewerker, opdrachtgever) met inloggen via e-mail, pushmeldingen, conflictberekening per week op de server voor een heel jaar data, koppelingen met de planningssystemen van opdrachtgevers, rechten op gevoelige gegevens (BSN, documenten).
- Afsluiten: "Wat werkt: alles wat je zag. Wat niet: de rollen zijn in de demo nagebootst. Bedankt voor het kijken."
