# Videoscript (max 10 minuten, doel 9:30)

Versie voor branch `dev` (met licenties, opdrachtgeversportaal en sporttassen). Voor de versie zonder die uitbreiding: zie de git-geschiedenis van dit bestand op `main`.

Tip: neem op met Loom, scherm + gezicht. Begin met een verse login, zodat je met de originele testdata werkt. Houd een tweede tabblad klaar met je inbox.

## 0:00 Intro en keuzes (0:45)

- "Ik heb Sanne's vier problemen opgelost en daarna drie dingen uit jullie functielijst toegevoegd: licenties, een portaal voor opdrachtgevers en sporttassen."
- Bewust niet: uren en facturatie, documenten en BSN, ruilen, echte accounts per rol.

## 0:45 Inloggen en de sandbox (0:30)

- Eigen kopie van de data per login (Row Level Security in de database). "Bekijk als": planner, medewerker, opdrachtgever.

## 1:15 Conflicten zonder valse meldingen (1:30)

- Maandag: Tom overlap, Noor te weinig reistijd, Daan niet beschikbaar. Alles in gewone taal.
- Vrijdag Gijs: precies genoeg reistijd, dus "krap" en geen conflict.
- "Ik heb de testdata eerst met een los script doorgerekend: 15 echte conflicten. Dat is een test: de app moet precies die 15 vinden en geen valse."

## 2:45 Overzicht en herhaling (1:15)

- "Conflicten" en "Open" als filter, zoeken, Week en Maand.
- Nieuwe dienst met "elke derde vrijdag": de datums en de controle per datum staan er voor je opslaat.

## 4:00 Wijziging, log en bericht (1:00)

- Hana van D041 halen, reden verplicht, bericht naar de opdrachtgever binnen 7 dagen (zonder de reden, privacy). Log kan niet worden aangepast. Echte e-mail in je inbox.

## 5:00 Licenties (1:00)

- Medewerkers: Nina's EHBO is verlopen, Amber's verloopt op de dag van haar laatste zwemdienst (oranje, nog geldig).
- Woensdag: Hana mist Kinder-EHBO op een KDV, Bo mist BHV op een drukke dienst.
- "Jullie testdata had geen licenties. Ik heb daar een kleine, duidelijk gemarkeerde aanvulling voor gemaakt, met eigen controles. De 15 conflicten op jullie data blijven precies hetzelfde."

## 6:00 Opdrachtgever boekt, planner plant (1:30)

- Bekijk als Sportbedrijf Kust & Rijn: planning over alle zwembaden, nieuwe aanvraag (Aqualessen, Waterlelie, maandag 26 oktober).
- Planner: Aanvragen, goedkeuren, op het planbord "Stel iemand voor": alleen coaches met geldige EHBO, Nina staat er niet tussen.
- Terug als opdrachtgever: "Ingepland met ...", profiel met licenties, geen achternaam of BSN.
- Locatie toevoegen in Utrecht: "reistijden nog onbekend". "Liever eerlijk onbekend dan een vals groen vinkje."

## 7:30 Sporttassen (0:45)

- Medewerker Emma op de telefoon: "Neem mee: Jachtseizoen tas 1", paklijst afvinken, "Er mist iets".
- Planner, Tassen: de melding, en dinsdag dezelfde tas bij twee coaches.

## 8:15 Medewerker-app kort (0:30)

- Noor: eigen diensten, beschikbaarheid doorgeven, open dienst aannemen die bij haar functie past.

## 8:45 AI en eerlijkheid (0:45)

- "Ik stuurde, Claude bouwde. Ik controleerde met tests en scripts die los van de app staan." Noem twee correcties uit de toelichting.
- Wat niet af is: rollen zijn nagebootst, conflicten worden in de browser berekend (voor een jaar data per week op de server), geen pushmeldingen of koppelingen.
