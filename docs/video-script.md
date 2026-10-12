# Videoscript (max 10 minuten, doel 9:30)

Versie voor branch `dev` (met licenties, opdrachtgeversportaal, sporttassen en dashboard). Voor de versie zonder die uitbreiding: zie de git-geschiedenis van dit bestand op `main`.

Tip: neem op met Loom, scherm + gezicht. Begin met een verse login, zodat je met de originele testdata werkt. Houd een tweede tabblad klaar met je inbox. Neem de onderdelen op in deze volgorde: de overdracht van D105 en het weghalen van Hana veranderen de cijfers voor de stukken daarna.

## 0:00 Intro en keuzes (0:40)

- "Ik heb Sanne's vier problemen opgelost en daarna drie dingen uit jullie functielijst toegevoegd: licenties, een portaal voor opdrachtgevers en sporttassen. Met een dashboard erboven."
- Bewust niet: uren en facturatie, documenten en BSN, ruilen, echte accounts per rol.

## 0:40 Inloggen en het dashboard (1:00)

- Eigen kopie van de data per login (Row Level Security in de database). "Bekijk als": planner, medewerker, opdrachtgever.
- Dashboard, deze en volgende week: 293 diensten, 92% ingevuld, 22 open, 29 diensten met een conflict, 3 aanvragen, licenties en tassen. Diensten per dag, werkverdeling (wie heeft nog ruimte), vulgraad per opdrachtgever.
- "Elk getal is een link naar de plek waar je het oplost, en naar de week van het eerste probleem, niet naar een lege week." Klik op Conflicten.

## 1:40 Conflicten zonder valse meldingen, en oplossen (1:40)

- Planbord, maandag: bovenaan open diensten, dan het blok Conflicten met Tom (overlap), Noor (te weinig reistijd) en Daan (niet beschikbaar). Alles in gewone taal. De rest staat onder Per medewerker; blokken klap je dicht.
- Vrijdag Gijs: precies genoeg reistijd, dus "krap" en geen conflict.
- "Ik heb de testdata eerst met een los script doorgerekend: 15 echte conflicten. Dat is een test: de app moet precies die 15 vinden en geen valse."
- Oplossen: bij Tom's D105 op "Iemand anders". Alleen mensen met de juiste functie die er geen nieuw conflict door krijgen. Eva neemt hem over, Tom verdwijnt uit Conflicten, en het staat in het log.

## 3:20 Overzicht en herhaling (0:50)

- Zoeken en filters werken direct, ook met alle 293 diensten. Week en Maand.
- Nieuwe dienst met "elke derde vrijdag": de datums en de controle per datum staan er voor je opslaat. Datums in het verleden kun je niet kiezen.

## 4:10 Wijziging, log en bericht (0:50)

- Hana van D041 halen, reden verplicht, bericht naar de opdrachtgever binnen 7 dagen (zonder de reden, privacy). Log kan niet worden aangepast. Echte e-mail in je inbox.

## 5:00 Eén medewerker bekijken (0:20)

- Klik op een naam op het planbord: uren per week, wat aandacht nodig heeft, komende diensten, licenties, waar diegene vaak werkt.

## 5:20 Licenties (0:50)

- Medewerkers: Nina's EHBO is verlopen, Amber's verloopt op de dag van haar laatste zwemdienst (oranje, nog geldig).
- Woensdag: Hana mist Kinder-EHBO op een KDV, Bo mist BHV op een drukke dienst.
- "Jullie testdata had geen licenties. Ik heb daar een kleine, duidelijk gemarkeerde aanvulling voor gemaakt, met eigen controles. De 15 conflicten op jullie data blijven precies hetzelfde."

## 6:10 Opdrachtgever boekt, planner plant (1:20)

- Bekijk als Sportbedrijf Kust & Rijn: de dag als tijdlijn per zwembad (ook week en maand), nieuwe aanvraag (Aqualessen, Waterlelie, maandag 26 oktober).
- Planner: Aanvragen, goedkeuren, op het planbord "Stel iemand voor": alleen coaches met geldige EHBO, Nina staat er niet tussen.
- Terug als opdrachtgever: "Ingepland met ...", profiel met licenties, geen achternaam of BSN.
- Locatie toevoegen in Utrecht: "reistijden nog onbekend". "Liever eerlijk onbekend dan een vals groen vinkje."

## 7:30 Sporttassen en de medewerker-app (0:55)

- Medewerker Emma op de telefoon: haar diensten, "Neem mee: Jachtseizoen tas 1", paklijst afvinken, "Er mist iets". "Dit is ook waar medewerkers beschikbaarheid doorgeven en open diensten aannemen."
- Planner: op het dashboard het getal bij Tassen, dat opent dinsdag: de tijdlijn per tas laat zien wie welke tas wanneer heeft. Jachtseizoen tas 1 staat rood, bij Anouk en Emma tegelijk. De melding van Emma staat er ook, en op het planbord bij elke dienst met die tas.

## 8:25 AI, eerlijkheid en meer tijd (0:55)

- "Ik stuurde, Claude bouwde. Ik controleerde met tests en scripts die los van de app staan." Noem twee correcties uit de toelichting, bijvoorbeeld:
  - de teller "Alleen conflicten" zei 6 en het blok 4, omdat het ene diensten telde en het andere conflicten;
  - een test die soms faalde, bleek de ontwikkelserver te zijn en niet de app; bewezen door dezelfde tests op een productiebuild te draaien.
- Wat niet af is: rollen zijn nagebootst, conflicten worden in de browser berekend.
- Met meer tijd: conflicten per week op de server (voor een jaar data), echte accounts per rol, pushmeldingen, ruilen van diensten en een koppeling met de urenregistratie.

## 9:20 Afsluiting (0:10)

- "De link en de inloggegevens staan in de mail. Elke login krijgt een eigen, schone kopie, dus je kunt alles uitproberen."
