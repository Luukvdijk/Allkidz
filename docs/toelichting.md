# Planning-demo voor AllKidz: wat ik bouwde en hoe

**In het kort.** Een werkende planningsapp waarin een planner diensten inplant en direct ziet wat er misgaat: iemand die op twee plekken tegelijk staat, te weinig reistijd heeft of niet beschikbaar is. Alles draait op jullie testdata, en elke login krijgt een eigen kopie, dus je kunt niets kapotmaken.

**Zo probeer je het zelf (2 minuten).**
1. Log in met de gegevens uit de mail en kies bovenaan "Dashboard".
2. Klik op het getal bij "Conflicten" en kies daarna bovenaan "Dag". Bij maandag 19 oktober staat Tom bij Conflicten: hij is op twee plekken tegelijk ingepland.
3. Klik bij zijn dienst op "Iemand anders" en dan op "Overnemen". Het probleem is weg, en de wijziging staat in het wijzigingslog.

**Wat de opdracht vroeg, en wat de app nu doet.**
- *Dienst aanmaken en herhalen:* eenmalig, op losse datums of als patroon, zoals "elke derde vrijdag". Voor je opslaat zie je per datum al of het botst.
- *Dagoverzicht per medewerker:* de hele dag op volgorde, met de reistijd ertussen en problemen in gewone taal. De app vindt precies de 15 echte problemen in jullie data, en geen valse.
- *Zoeken en filteren:* op dag, medewerker, locatie, alleen problemen of alleen open diensten. Dat gaat direct.
- *Wijzigingslog:* wie wat wanneer veranderde en waarom. Een reden is verplicht en niemand kan het log aanpassen.

**Wat ik extra bouwde, en waarom.**
- *Een app voor medewerkers* om diensten te bekijken, door te geven wanneer ze niet kunnen en open diensten aan te nemen. Jullie hebben nu ook een app; ik wilde laten zien wat er als webapp kan, zonder iets te installeren.
- *Een automatisch bericht* aan de opdrachtgever bij een wijziging binnen 7 dagen, zonder de privéreden. Die termijn is instelbaar, zodat jullie die grens zelf kunnen kiezen.
- *Hulp bij oplossen en overzicht:* "Stel iemand voor" toont wie een dienst kan doen zonder nieuw probleem, en een dashboard laat alles in één oogopslag zien.
- *Uit jullie functielijst:* licenties met vervaldatum, een portaal waar opdrachtgevers diensten aanvragen, en sporttassen. Daarvoor maakte ik met jullie akkoord een kleine fictieve aanvulling op de testdata.

**Hoe ik AI gebruikte.** Ik werkte met Claude Code, een AI die code schrijft en de app zelf in een browser kan testen. De keuzes maakte ik en de AI bouwde. Ik las de code en de scripts mee, paste zelf dingen aan en controleerde elke stap. Wat ik vroeg, en wat dat opleverde:
- *"Lees de opdracht, de functielijst en de testdata. Waar letten ze op, en welke valkuilen zitten in de data? Nog geen code."* Zo begon ik met begrijpen in plaats van bouwen, en koos ik daarna zelf wat erin kwam.
- *"Zet de medewerkers met een conflict in het blok Conflicten, in dezelfde vorm, zodat ze makkelijk op te lossen zijn. En stel daar net als bij een open dienst een oplossing voor."* Nu staat elk probleem bovenaan, met een knop die alleen mensen voorstelt die er geen nieuw probleem door krijgen.
- *"Als ik filters toepas en het duurt even, ziet het er raar uit. Kijk ook naar laadschermen."* Bij het uitzoeken bleek dat elke klik alles opnieuw ophaalde. In plaats van een laadicoon werkt filteren nu direct.

**Wat ik zelf deed.** Ik testte alles zelf, op laptop en telefoon, en vond onderweg kleine fouten die de AI daarna oploste, zoals een knop die 6 problemen telde terwijl het blok eronder er 4 liet zien, en datums in het verleden die je nog kon kiezen. Daarnaast zorgde ik dat de site veilig is: alleen wie de inloggegevens heeft komt erin, niemand kan eindeloos demo-omgevingen aanmaken, en een verzoek aan de server doet alleen wat het mag. Waar nodig paste ik de code daarvoor zelf aan.

**Hoe ik het in het echt zou aanpakken.** Deze demo bouwde ik op de opdracht en mijn eigen inschatting. In een echt project begin ik liever niet bij wat ik zelf het beste vind. Ik praat eerst met planners, medewerkers en opdrachtgevers: wat werkt nu goed, waar ergeren ze zich aan en hoe plannen ze echt? Daar bouw ik op verder. Daarna zou ik toevoegen: echte inlogaccounts per rol, meldingen op de telefoon, diensten ruilen en een koppeling met de urenregistratie.
