# Toelichting: hoe ik AI gebruikte

**Gereedschap.** Claude Code, met toegang tot mijn code, de Supabase-database en een browser om zelf te testen.

**Werkwijze.**
1. *Eerst begrijpen, dan bouwen.* Ik liet Claude de opdracht, de functielijst en de testdata samenvatten en vroeg om keuzes in plaats van code. De keuzes maakte ik zelf: Supabase, een eigen kopie van de data per login en een instelbare meldingstermijn van 7 dagen, omdat AllKidz die grens nog moet bepalen.
2. *Eerst de data narekenen.* Voor er app-code was, rekende een los script de testdata door: 15 echte conflicten en de valkuilen die erop lijken. Dat werd de "gouden test": de app moet precies die 15 vinden en geen valse melding geven.
3. *Logica los van schermen.* Conflicten, herhaling, filters, tassen en het dashboard zijn losse functies zonder database of React. Nieuwe regels kregen eerst een test, daarna de code.
4. *Zelf controleren.* Elk scherm doorgeklikt op laptop en telefoon, plus een security-scan (Aikido, geen bevindingen).

**Voorbeelden van prompts.**
- "Lees de opdracht, de functielijst en de testdata. Wat moet erin, waar letten ze op, en welke valkuilen zitten in de data? Nog geen code."
- "Schrijf een los script dat alle conflicten in de testdata telt, inclusief gevallen die op een conflict lijken maar het niet zijn."
- "Schrijf eerst de test met deze 15 conflicten en deze valkuilen, en dan pas de functie."

**Waar ik moest bijsturen.**
- *Randgevallen.* Diensten die op elkaar aansluiten overlappen niet, precies genoeg reistijd is "krap" en geen conflict. Die grenzen staan nu in tests.
- *Traag is niet altijd een spinner.* Filteren voelde traag. Een laadicoon had het verstopt, maar elke klik haalde de hele planning opnieuw van de server, terwijl filteren in de browser gebeurt. Nu duurt een filter 19 milliseconden.
- *Tellers die elkaar tegenspraken.* De knop "Alleen conflicten" zei 6, het blok eronder 4: de ene telde diensten, de andere conflicten. Alles telt nu diensten.
- *Een test die soms faalde.* Ik liet de test niet aanpassen tot hij slaagde, maar liet uitzoeken waarom. Het bleek de ontwikkelserver te zijn en niet de app: dezelfde tests slaagden steeds op een productiebuild.
- *Beveiliging.* Een waarschuwing van de database-adviseur bracht me op een echt risico: iemand kon eindeloos demo-omgevingen aanmaken. Dat heb ik dichtgezet.

**Uitbreiding (licenties, opdrachtgevers, tassen, dashboard).** Jullie testdata bevatte geen licenties, opdrachtgevers of tassen. Daarvoor maakte ik een kleine fictieve aanvulling in een apart bestand, met een eigen controlescript; op jullie eigen data blijven het precies 15 conflicten. Ook hier stuurde ik bij: de AI plande activiteiten om 07:30, voor schooltijd, en de live controle zag een tas bij een andere coach over het hoofd (eerst met een falende test aangetoond, daarna opgelost).

**Privacy en testen.** Alleen fictieve data. Elke login is afgeschermd met Row Level Security. Het wijzigingslog kan niet worden aangepast. De reden van een afmelding gaat niet naar de opdrachtgever, en een e-mailadres voor de demo-mail wordt niet opgeslagen. 112 unit-tests (waarvan twee gouden tests) en 4 end-to-end tests.

**Wat nog niet af is.** Rollen worden nagebootst ("Bekijk als") in plaats van echte accounts. Conflicten worden in de browser berekend; voor een jaar aan data zou ik dat per week op de server doen.
