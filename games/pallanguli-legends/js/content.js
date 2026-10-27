/* PALLANGULI LEGENDS - rules text generated from the selected config, tutorial and history. */
(function (root) {
  'use strict';
  function rules(cfg, lang) {
    var sp = cfg.seedsPerPit, tot = cfg.totalSeeds, r = [];
    if (lang === 'ta') {
      r.push('பலகையில் 14 குழிகள்; ஒவ்வொருவருக்கும் 7. கீழ் வரிசை A1–A7 (ஆட்டக்காரர் A), மேல் வரிசை B1–B7 (ஆட்டக்காரர் B). ஒவ்வொரு குழியிலும் ' + sp + ' விதைகள் (மொத்தம் ' + tot + ').');
      r.push('உங்கள் முறையில், உங்கள் பக்க விதை உள்ள ஒரு குழியின் எல்லா விதைகளையும் எடுத்து, அடுத்தடுத்த குழிகளில் ஒவ்வொன்றாக இடஞ்சுழியாக (anticlockwise) விதையுங்கள்: A1→A7, பின் B1→B7, பின் மீண்டும் A1. ' + (cfg.skipOrigin ? 'முழு சுற்று வந்தால் தொடங்கிய குழி தவிர்க்கப்படும்.' : 'முழு சுற்று வந்தால் தொடங்கிய குழியிலும் ஒரு விதை விழும்.'));
      r.push('கடைசி விதைக்குப் பின் அடுத்த குழியைப் பாருங்கள்: அதில் விதைகள் இருந்தால் அவற்றை எடுத்து தொடர்ந்து விதையுங்கள்.');
      r.push('அடுத்த குழி காலியாக இருந்தால், அதற்கு அடுத்த குழியின் எல்லா விதைகளும் உங்களுக்கு' + (cfg.captureOpposite ? ', அதன் எதிர் குழியின் விதைகளும் சேர்த்து' : '') + '. உங்கள் முறை முடியும்.');
      r.push('தொடர்ந்து இரண்டு குழிகள் காலியாக இருந்தால், கைப்பற்றல் இல்லாமல் முறை முடியும்.');
      if (cfg.pasu) r.push('பசு: விதைக்கும்போது ஏதேனும் குழியில் சரியாக 4 விதைகள் ஆனால், அந்த 4 விதைகள் ' + (cfg.pasuBy === 'owner' ? 'அந்தக் குழியின் உரிமையாளருக்கு' : 'விதைப்பவருக்கு') + ' போகும்.');
      r.push('ஆட வேண்டியவரின் பக்கத்தில் விதைகள் இல்லையென்றால் சுற்று முடியும்; பலகையில் மீதி உள்ள விதைகள் அந்தந்த பக்க உரிமையாளருக்கு. (டிஜிட்டல் பாதுகாப்பு விதி: 40 நகர்வுகள் கைப்பற்றல் இல்லையென்றாலும் சுற்று முடியும்.)');
      if (!cfg.multiRound) r.push('வெற்றி: அதிக விதைகள் கைப்பற்றியவர் வெல்வார். சமமானால் சமநிலை.');
      else r.push('வெற்றி (பல சுற்று): ஒவ்வொரு சுற்றுக்குப் பிறகும், ஒவ்வொருவரும் தம் விதைகளிலிருந்து இடமிருந்து வலமாக ஒவ்வொரு குழியிலும் ' + sp + ' விதைகள் நிரப்புவர். நிரப்ப முடியாத குழிகள் அடுத்த சுற்றில் மூடப்படும் (விதைப்பில் தவிர்க்கப்படும்). ஒரு குழியையும் நிரப்ப முடியாதவர் தோற்பார்; தொடர முடிந்தவர் வெல்வார். (' + cfg.maxRounds + ' சுற்றுகளுக்குப் பின் அதிக விதைகள் உள்ளவர் வெல்வார்.)');
      return r;
    }
    r.push('The board has 14 pits, 7 per player. Player A owns the bottom row (A1–A7), Player B the top row (B1–B7). Each pit starts with ' + sp + ' seeds (' + tot + ' in total).');
    r.push('On your turn, lift all the seeds from one of your non-empty pits and sow them one per pit, anticlockwise: A1→A7, then B1→B7, then back to A1. ' + (cfg.skipOrigin ? 'On a full lap, the pit you lifted from is skipped.' : 'On a full lap, the pit you lifted from also gets a seed.'));
    r.push('After the last seed, look at the next pit. If it has seeds, lift them and keep sowing from there.');
    r.push('If the next pit is empty, you capture all the seeds in the pit after it' + (cfg.captureOpposite ? ', plus the seeds in the pit directly opposite that one' : '') + '. Your turn ends.');
    r.push('If two pits in a row are empty, your turn ends with no capture.');
    if (cfg.pasu) r.push('Pasu (four-seed rule): whenever a pit reaches exactly 4 seeds during sowing, those 4 seeds are captured by ' + (cfg.pasuBy === 'owner' ? 'the owner of that pit.' : 'the player who is sowing.'));
    r.push('A round ends when the player to move has no seeds on their side. Seeds left on the board go to the owner of the side they are on. (Digital safety rule: a round also ends after 40 moves in a row without any capture.)');
    if (!cfg.multiRound) r.push('Victory: the player with more seeds captured wins. Equal seeds is a draw.');
    else r.push('Victory (multi-round): after each round, each player refills their pits from left to right with ' + sp + ' seeds each, using their own seeds. Pits they cannot fill are closed for the next round and skipped when sowing; leftover seeds stay in their store. A player who cannot fill even one pit loses, and the last player able to continue wins. (Safety cap: after ' + cfg.maxRounds + ' rounds, more seeds wins.)');
    return r;
  }
  var history = {
    en: [
      'Pallanguli (பல்லாங்குழி) is a traditional board game of Tamil Nadu and other parts of South India, and it is also played by Tamil communities elsewhere, such as in Sri Lanka.',
      'It belongs to the mancala family of “sowing and capturing” games, which are played in many forms around the world.',
      'It is usually played on a wooden board with two rows of pits, using tamarind seeds, cowrie shells or small stones. Many homes kept a board, and it was a common pastime for family members of all ages.',
      'There is no single official rulebook. Families and regions differ on the number of seeds per pit, the four-seed (pasu) rule, captures and the number of rounds. That is why this app lets you choose the rules before each match.',
      'The game encourages counting, memory and planning ahead.'
    ],
    ta: [
      'பல்லாங்குழி தமிழ்நாடு மற்றும் தென்னிந்தியாவின் பிற பகுதிகளில் விளையாடப்படும் பாரம்பரிய பலகை விளையாட்டு. இலங்கை போன்ற இடங்களில் வாழும் தமிழ் மக்களும் இதை விளையாடுகிறார்கள்.',
      'இது உலகின் பல பகுதிகளில் விளையாடப்படும் “மங்கலா” (mancala) வகை விதைத்து-கைப்பற்றும் விளையாட்டுகளில் ஒன்று.',
      'பொதுவாக இரண்டு வரிசை குழிகள் கொண்ட மரப் பலகையில், புளியங்கொட்டை, சோழி அல்லது சிறு கற்களால் விளையாடப்படுகிறது. எல்லா வயதினரும் வீட்டில் விளையாடும் பொழுதுபோக்கு.',
      'ஒரே அதிகாரப்பூர்வ விதிப்புத்தகம் இல்லை. குழிக்கு எத்தனை விதைகள், பசு விதி, கைப்பற்றல், சுற்றுகள் ஆகியவை குடும்பத்துக்கும் ஊருக்கும் ஏற்ப மாறும். அதனால்தான் இந்த செயலியில் ஒவ்வொரு ஆட்டத்துக்கும் முன் விதிகளைத் தேர்ந்தெடுக்கலாம்.',
      'இந்த விளையாட்டு எண்ணுதல், நினைவாற்றல், முன்யோசனை ஆகியவற்றை வளர்க்கிறது.'
    ]
  };
  // Tutorial cards: board = 14 counts, hl = {pit: class}
  var tutorial = [
    { en: ['Your side', 'You are Player A: the bottom row, A1 to A7. The computer or your friend is Player B on the top row. Every pit starts with 5 seeds.'],
      ta: ['உங்கள் பக்கம்', 'நீங்கள் ஆட்டக்காரர் A: கீழ் வரிசை A1 முதல் A7. கணினி அல்லது நண்பர் மேல் வரிசை B. ஒவ்வொரு குழியிலும் 5 விதைகள்.'],
      board: [5,5,5,5,5,5,5,5,5,5,5,5,5,5], hl: { 0: 'own', 1: 'own', 2: 'own', 3: 'own', 4: 'own', 5: 'own', 6: 'own' } },
    { en: ['Sow anticlockwise', 'Lift every seed from one of your pits and drop one in each following pit: along your row to A7, up to B1, across to B7, and back to A1. Here A5 had 5 seeds.'],
      ta: ['இடஞ்சுழியாக விதை', 'உங்கள் ஒரு குழியின் எல்லா விதைகளையும் எடுத்து, அடுத்தடுத்த குழிகளில் ஒவ்வொன்றாக இடுங்கள்: A7 வரை, பின் B1, B7 வரை, மீண்டும் A1. இங்கு A5 இல் 5 விதைகள் இருந்தன.'],
      board: [5,5,5,5,0,6,6,6,6,6,5,5,5,5], hl: { 4: 'lift', 5: 'sow', 6: 'sow', 7: 'sow', 8: 'sow', 9: 'sow' } },
    { en: ['Keep going', 'After your last seed, look at the next pit. If it has seeds, lift them all and keep sowing. One move can travel round the board several times!'],
      ta: ['தொடருங்கள்', 'கடைசி விதைக்குப் பின் அடுத்த குழியைப் பாருங்கள். அதில் விதைகள் இருந்தால், எடுத்து தொடர்ந்து விதையுங்கள்.'],
      board: [5,5,5,5,0,6,6,6,6,6,5,5,5,5], hl: { 9: 'sow', 10: 'next' } },
    { en: ['Capture', 'If the next pit is empty, you capture every seed in the pit just after it. Here A3 is empty, so the seeds in A4 are yours. Then your turn ends.'],
      ta: ['கைப்பற்று', 'அடுத்த குழி காலியானால், அதற்கு அடுத்த குழியின் எல்லா விதைகளும் உங்களுக்கு. இங்கு A3 காலி; A4 இன் விதைகள் உங்களுக்கு.'],
      board: [2,3,0,7,1,0,4,3,0,2,6,1,0,5], hl: { 1: 'sow', 2: 'empty', 3: 'cap' } },
    { en: ['Two empty pits', 'If the next two pits are both empty, nothing is captured and your turn simply ends.'],
      ta: ['இரண்டு காலி குழிகள்', 'அடுத்த இரண்டு குழிகளும் காலியானால், கைப்பற்றல் இல்லை; உங்கள் முறை முடியும்.'],
      board: [2,3,0,0,4,1,4,3,0,2,6,1,0,5], hl: { 1: 'sow', 2: 'empty', 3: 'empty' } },
    { en: ['Pasu and winning', 'In the four-seed (pasu) variant, any pit that reaches exactly 4 seeds is taken at once. When a player has no seeds to play, the round ends. Most seeds captured wins, or in multi-round play, the last player who can still fill a pit wins.'],
      ta: ['பசு மற்றும் வெற்றி', 'பசு முறையில், எந்தக் குழியில் சரியாக 4 விதைகள் ஆனாலும் உடனே எடுக்கப்படும். ஒருவரிடம் ஆட விதைகள் இல்லையென்றால் சுற்று முடியும். அதிக விதைகள் கைப்பற்றியவர் வெல்வார்; பல சுற்று முறையில் கடைசி வரை குழி நிரப்ப முடிந்தவர் வெல்வார்.'],
      board: [0,3,4,1,0,2,6,3,4,0,1,5,2,0], hl: { 2: 'pasu', 8: 'pasu' } }
  ];
  root.PallContent = { rules: rules, history: history, tutorial: tutorial };
})(typeof self !== 'undefined' ? self : this);
