# Toelichting: hoe ik AI gebruikte (concept, max 1 A4)

**Gereedschap.** Claude Code (in de terminal en de desktop-app), met toegang tot mijn code, de Supabase-database en een browser om zelf te testen.

**Werkwijze.**
1. *Eerst begrijpen, dan bouwen.* Ik liet Claude de opdracht, de functielijst en de testdata samenvatten en vroeg om keuzes in plaats van code. Ik koos zelf: Supabase in plaats van alleen de browser, een eigen kopie van de data per login, extra's medewerker-app en automatisch bericht, en een meldingstermijn van 7 dagen die instelbaar is omdat AllKidz die grens nog moet bepalen.
2. *Eerst de data narekenen.* Voor er een regel app-code was, liet ik een los script de testdata doorrekenen: 15 echte conflicten (5 overlap, 4 reistijd, 4 niet beschikbaar, 2 verkeerde functie) en de valkuilen die erop lijken. Die lijst werd de "gouden test": de app moet precies die 15 vinden en geen enkele valse melding geven.
3. *Logica los van schermen.* Conflicten, herhaling, filters en berichten zijn losse functies zonder database of React, met 64 tests. Pas daarna kwamen database en schermen.
4. *Zelf controleren in de browser.* Elk scherm heb ik doorgeklikt, plus een end-to-end test die inloggen, conflicten, afmelden met reden, log en bericht naloopt.

**Voorbeelden van prompts.**
- "Lees de opdracht, de functielijst en de testdata. Wat moet erin, waar letten ze op, en welke valkuilen zitten in de data? Nog geen code."
- "Schrijf een los script dat alle conflicten in de testdata telt, inclusief gevallen die op een conflict lijken maar het niet zijn."
- "Schrijf eerst de test met deze 15 conflicten en deze valkuilen, en dan pas de functie."

**Waar ik moest bijsturen.**
- *Randgevallen.* Ik heb de grenzen expliciet gemaakt in tests: diensten die op elkaar aansluiten overlappen niet, precies genoeg reistijd is "krap" en geen conflict, en wie om 20:00 niet beschikbaar is maar tot 20:00 werkt, heeft geen conflict.
- *Nieuwe Next.js-versie.* De AI kende de nieuwste Next.js nog niet goed (Cache Components). Ik heb de meegeleverde documentatie laten lezen en de fout ("Date.now tijdens prerender") volgens die documentatie opgelost.
- *Niet alles is een bug.* Pagina's leken te blijven laden in de testbrowser. In plaats van code te veranderen heb ik laten onderzoeken waarom: de inhoud was er wel, maar de verborgen browser pauzeerde het tonen ervan.
- *Beveiliging.* De database-adviseur gaf een waarschuwing. Die was op zich bedoeld, maar bracht me op een echt risico: iemand kon eindeloos nieuwe demo-omgevingen aanmaken. Dat heb ik dichtgezet.
- *Eerlijke teksten.* Een melding beloofde dat de opdrachtgever een wijziging zag, ook als er geen bericht werd verstuurd. Aangepast.

**Privacy en testen.** Alleen de fictieve testdata. Elke login is afgeschermd met Row Level Security in de database. Het wijzigingslog kan niet worden aangepast of verwijderd. De reden van een afmelding (bijvoorbeeld ziek) gaat niet naar de opdrachtgever. Een e-mailadres voor de demo-mail wordt niet opgeslagen. Demo-omgevingen verdwijnen na 7 dagen.

**Wat nog niet af is.** Rollen worden in de demo nagebootst ("Bekijk als") in plaats van echte accounts. Conflicten worden in de browser berekend; voor een jaar aan data zou ik dat per week op de server doen.
