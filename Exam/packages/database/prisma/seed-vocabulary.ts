import { pgDb } from '../src/index';

export interface SeedVocabWord {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  difficulty: 'B1' | 'B2' | 'C1' | 'C2';
}

export const SEED_VOCABULARY_WORDS: SeedVocabWord[] = [
  {
    "word": "achieve",
    "phonetic": "/əˈtʃiːv/",
    "partOfSpeech": "verb",
    "definition": "To successfully complete or accomplish something through effort, skill, or courage.",
    "exampleSentence": "Students must study consistently to achieve high scores on the IELTS exam.",
    "synonyms": [
      "attain",
      "accomplish",
      "reach",
      "fulfill"
    ],
    "antonyms": [
      "fail",
      "abandon"
    ],
    "difficulty": "B1"
  },
  {
    "word": "analyse",
    "phonetic": "/ˈæn.əl.aɪz/",
    "partOfSpeech": "verb",
    "definition": "To examine something methodically and in detail in order to explain and interpret it.",
    "exampleSentence": "Researchers must analyse the raw survey data before drawing conclusions.",
    "synonyms": [
      "examine",
      "investigate",
      "evaluate",
      "scrutinize"
    ],
    "antonyms": [
      "ignore",
      "overlook"
    ],
    "difficulty": "B1"
  },
  {
    "word": "benefit",
    "phonetic": "/ˈben.ɪ.fɪt/",
    "partOfSpeech": "noun",
    "definition": "An advantage or positive result gained from something.",
    "exampleSentence": "Regular physical activity provides numerous health benefits for university students.",
    "synonyms": [
      "advantage",
      "gain",
      "asset",
      "perk"
    ],
    "antonyms": [
      "detriment",
      "disadvantage",
      "drawback"
    ],
    "difficulty": "B1"
  },
  {
    "word": "category",
    "phonetic": "/ˈkæt.ə.ɡr.i/",
    "partOfSpeech": "noun",
    "definition": "A class or division of people or things regarded as having particular shared characteristics.",
    "exampleSentence": "The academic reading section divides questions into several distinct categories.",
    "synonyms": [
      "classification",
      "group",
      "class",
      "genre"
    ],
    "antonyms": [
      "whole",
      "entity"
    ],
    "difficulty": "B1"
  },
  {
    "word": "create",
    "phonetic": "/kriˈeɪt/",
    "partOfSpeech": "verb",
    "definition": "To bring something into existence or cause something to happen.",
    "exampleSentence": "The government aims to create new employment opportunities for recent graduates.",
    "synonyms": [
      "generate",
      "produce",
      "establish",
      "develop"
    ],
    "antonyms": [
      "destroy",
      "dismantle",
      "annihilate"
    ],
    "difficulty": "B1"
  },
  {
    "word": "culture",
    "phonetic": "/ˈkʌl.tʃər/",
    "partOfSpeech": "noun",
    "definition": "The customs, arts, social institutions, and achievements of a particular nation or social group.",
    "exampleSentence": "Studying abroad allows students to experience a completely different culture.",
    "synonyms": [
      "heritage",
      "tradition",
      "customs",
      "society"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "economy",
    "phonetic": "/ɪˈkɒn.ə.mi/",
    "partOfSpeech": "noun",
    "definition": "The state of a country or region in terms of the production and consumption of goods and services.",
    "exampleSentence": "The rapid growth of the digital economy has transformed traditional commerce.",
    "synonyms": [
      "financial system",
      "market",
      "commerce",
      "trade"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "environment",
    "phonetic": "/ɪnˈvaɪ.rən.mənt/",
    "partOfSpeech": "noun",
    "definition": "The surroundings or conditions in which a person, animal, or plant lives or operates.",
    "exampleSentence": "Protecting the natural environment is a central theme in modern sustainable development.",
    "synonyms": [
      "surroundings",
      "ecosystem",
      "habitat",
      "setting"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "evidence",
    "phonetic": "/ˈev.ɪ.dəns/",
    "partOfSpeech": "noun",
    "definition": "The available body of facts or information indicating whether a belief or proposition is true or valid.",
    "exampleSentence": "The author provides convincing empirical evidence to support her hypothesis.",
    "synonyms": [
      "proof",
      "data",
      "documentation",
      "substantiation"
    ],
    "antonyms": [
      "disproof",
      "refutation"
    ],
    "difficulty": "B1"
  },
  {
    "word": "factor",
    "phonetic": "/ˈfæk.tər/",
    "partOfSpeech": "noun",
    "definition": "A circumstance, fact, or influence that contributes to a result or outcome.",
    "exampleSentence": "Socioeconomic status is often a decisive factor in educational attainment.",
    "synonyms": [
      "element",
      "variable",
      "component",
      "determinant"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "focus",
    "phonetic": "/ˈfəʊ.kəs/",
    "partOfSpeech": "verb",
    "definition": "To adapt or pay particular attention to a central point of interest or activity.",
    "exampleSentence": "This dissertation will focus primarily on renewable energy solutions for urban areas.",
    "synonyms": [
      "concentrate",
      "center",
      "direct",
      "target"
    ],
    "antonyms": [
      "distract",
      "disperse"
    ],
    "difficulty": "B1"
  },
  {
    "word": "global",
    "phonetic": "/ˈɡləʊ.bəl/",
    "partOfSpeech": "adjective",
    "definition": "Relating to the whole world; worldwide.",
    "exampleSentence": "Climate change is a pressing global issue that demands international cooperation.",
    "synonyms": [
      "worldwide",
      "international",
      "universal",
      "planetary"
    ],
    "antonyms": [
      "local",
      "regional",
      "national"
    ],
    "difficulty": "B1"
  },
  {
    "word": "identify",
    "phonetic": "/aɪˈden.tɪ.faɪ/",
    "partOfSpeech": "verb",
    "definition": "To establish or indicate who or what someone or something is.",
    "exampleSentence": "The primary objective of the audit was to identify system security vulnerabilities.",
    "synonyms": [
      "recognize",
      "detect",
      "pinpoint",
      "determine"
    ],
    "antonyms": [
      "confuse",
      "misidentify"
    ],
    "difficulty": "B1"
  },
  {
    "word": "impact",
    "phonetic": "/ˈɪm.pækt/",
    "partOfSpeech": "noun",
    "definition": "The marked effect, influence, or impression of one thing on another.",
    "exampleSentence": "Urbanization has had a profound impact on local biodiversity.",
    "synonyms": [
      "effect",
      "influence",
      "consequence",
      "impression"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "individual",
    "phonetic": "/ˌɪn.dɪˈvɪdʒ.u.əl/",
    "partOfSpeech": "noun",
    "definition": "A single human being as distinct from a group, class, or family.",
    "exampleSentence": "Every individual in the trial completed a comprehensive questionnaire.",
    "synonyms": [
      "person",
      "human",
      "citizen",
      "participant"
    ],
    "antonyms": [
      "collective",
      "group",
      "society"
    ],
    "difficulty": "B1"
  },
  {
    "word": "issue",
    "phonetic": "/ˈɪʃ.uː/",
    "partOfSpeech": "noun",
    "definition": "An important topic or problem for debate or discussion.",
    "exampleSentence": "Affordable housing remains a controversial issue in major metropolitan centers.",
    "synonyms": [
      "matter",
      "problem",
      "concern",
      "topic"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "method",
    "phonetic": "/ˈmeθ.əd/",
    "partOfSpeech": "noun",
    "definition": "A particular procedure for accomplishing or approaching something, especially a systematic one.",
    "exampleSentence": "The research team developed an innovative method for water desalination.",
    "synonyms": [
      "technique",
      "approach",
      "procedure",
      "system"
    ],
    "antonyms": [
      "disorder",
      "chaos"
    ],
    "difficulty": "B1"
  },
  {
    "word": "occur",
    "phonetic": "/əˈkɜːr/",
    "partOfSpeech": "verb",
    "definition": "To happen, take place, or come into existence.",
    "exampleSentence": "Chemical reactions occur more rapidly under elevated ambient temperatures.",
    "synonyms": [
      "happen",
      "transpire",
      "arise",
      "materialize"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "period",
    "phonetic": "/ˈpɪə.ri.əd/",
    "partOfSpeech": "noun",
    "definition": "A length or portion of time characterized by specific events or stages.",
    "exampleSentence": "The Renaissance was a significant period of cultural and artistic rebirth.",
    "synonyms": [
      "era",
      "epoch",
      "duration",
      "timeframe"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "policy",
    "phonetic": "/ˈpɒl.ə.si/",
    "partOfSpeech": "noun",
    "definition": "A course or principle of action adopted or proposed by a government, party, or business.",
    "exampleSentence": "The university enacted a strict anti-plagiarism policy across all faculties.",
    "synonyms": [
      "guideline",
      "strategy",
      "protocol",
      "regulation"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "primary",
    "phonetic": "/ˈpraɪ.mər.i/",
    "partOfSpeech": "adjective",
    "definition": "Of chief importance; principal.",
    "exampleSentence": "The primary reason for migration in this demographic was educational opportunity.",
    "synonyms": [
      "principal",
      "main",
      "foremost",
      "predominant"
    ],
    "antonyms": [
      "secondary",
      "subordinate",
      "minor"
    ],
    "difficulty": "B1"
  },
  {
    "word": "principle",
    "phonetic": "/ˈprɪn.sə.pəl/",
    "partOfSpeech": "noun",
    "definition": "A fundamental truth or proposition that serves as the foundation for a system of belief or behavior.",
    "exampleSentence": "The legal framework is founded upon the principle of universal equality.",
    "synonyms": [
      "tenet",
      "doctrine",
      "foundation",
      "rule"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "process",
    "phonetic": "/ˈprəʊ.ses/",
    "partOfSpeech": "noun",
    "definition": "A series of actions or steps taken in order to achieve a particular end.",
    "exampleSentence": "Scientific peer review is an essential process for verifying academic literature.",
    "synonyms": [
      "procedure",
      "course",
      "operation",
      "progression"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "project",
    "phonetic": "/ˈprɒdʒ.ekt/",
    "partOfSpeech": "noun",
    "definition": "An individual or collaborative enterprise that is carefully planned to achieve an aim.",
    "exampleSentence": "The engineering cohort commenced a field project to build miniature solar arrays.",
    "synonyms": [
      "initiative",
      "venture",
      "undertaking",
      "assignment"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "publish",
    "phonetic": "/ˈpʌb.lɪʃ/",
    "partOfSpeech": "verb",
    "definition": "To prepare and issue a book, journal, piece of music, or other work for public sale or viewing.",
    "exampleSentence": "The faculty encourages doctoral candidates to publish in peer-reviewed journals.",
    "synonyms": [
      "print",
      "release",
      "issue",
      "distribute"
    ],
    "antonyms": [
      "withhold",
      "suppress"
    ],
    "difficulty": "B1"
  },
  {
    "word": "range",
    "phonetic": "/reɪndʒ/",
    "partOfSpeech": "noun",
    "definition": "The area of variation between upper and lower limits on a particular scale.",
    "exampleSentence": "The survey encompassed a wide range of demographic and economic backgrounds.",
    "synonyms": [
      "spectrum",
      "variety",
      "span",
      "scope"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "region",
    "phonetic": "/ˈriː.dʒən/",
    "partOfSpeech": "noun",
    "definition": "An area or division, especially part of a country or the world having definable characteristics.",
    "exampleSentence": "Drought conditions severely affected the agricultural output of the southern region.",
    "synonyms": [
      "district",
      "territory",
      "zone",
      "province"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "require",
    "phonetic": "/rɪˈkwaɪər/",
    "partOfSpeech": "verb",
    "definition": "To need for a particular purpose or depend on something for success.",
    "exampleSentence": "Admission to the master's programme requires an IELTS Academic score of 7.0.",
    "synonyms": [
      "demand",
      "necessitate",
      "mandate",
      "stipulate"
    ],
    "antonyms": [
      "exempt",
      "waive"
    ],
    "difficulty": "B1"
  },
  {
    "word": "research",
    "phonetic": "/rɪˈsɜːtʃ/",
    "partOfSpeech": "noun",
    "definition": "The systematic investigation into and study of materials and sources in order to establish facts.",
    "exampleSentence": "Groundbreaking research into mRNA vaccines accelerated therapeutic breakthroughs.",
    "synonyms": [
      "investigation",
      "inquiry",
      "study",
      "analysis"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "resource",
    "phonetic": "/rɪˈzɔːs/",
    "partOfSpeech": "noun",
    "definition": "A stock or supply of money, materials, staff, and other assets that can be drawn on.",
    "exampleSentence": "The university library provides vast digital resources for academic researchers.",
    "synonyms": [
      "asset",
      "material",
      "supply",
      "facility"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "respond",
    "phonetic": "/rɪˈspɒnd/",
    "partOfSpeech": "verb",
    "definition": "To say or do something as a reaction to someone or something.",
    "exampleSentence": "Participants were instructed to respond immediately upon hearing the acoustic cue.",
    "synonyms": [
      "reply",
      "react",
      "answer",
      "counter"
    ],
    "antonyms": [
      "ignore",
      "disregard"
    ],
    "difficulty": "B1"
  },
  {
    "word": "section",
    "phonetic": "/ˈsek.ʃən/",
    "partOfSpeech": "noun",
    "definition": "Any of the more or less distinct parts into which something is divided.",
    "exampleSentence": "The third section of the academic paper outlines the statistical methodology.",
    "synonyms": [
      "segment",
      "part",
      "portion",
      "division"
    ],
    "antonyms": [
      "whole",
      "entirety"
    ],
    "difficulty": "B1"
  },
  {
    "word": "source",
    "phonetic": "/sɔːs/",
    "partOfSpeech": "noun",
    "definition": "A place, person, or thing from which something comes or can be obtained.",
    "exampleSentence": "Primary historical sources provide authentic firsthand testimony of past events.",
    "synonyms": [
      "origin",
      "root",
      "provenance",
      "fount"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "specific",
    "phonetic": "/spəˈsɪf.ɪk/",
    "partOfSpeech": "adjective",
    "definition": "Clearly defined or identified; precise and detailed.",
    "exampleSentence": "Candidates should provide specific examples to illustrate their arguments in Task 2.",
    "synonyms": [
      "particular",
      "precise",
      "exact",
      "explicit"
    ],
    "antonyms": [
      "general",
      "vague",
      "ambiguous"
    ],
    "difficulty": "B1"
  },
  {
    "word": "structure",
    "phonetic": "/ˈstrʌk.tʃər/",
    "partOfSpeech": "noun",
    "definition": "The arrangement of and relations between the parts or elements of something complex.",
    "exampleSentence": "The internal structure of the cell was examined under an electron microscope.",
    "synonyms": [
      "framework",
      "architecture",
      "formation",
      "organization"
    ],
    "antonyms": [
      "disorganization",
      "chaos"
    ],
    "difficulty": "B1"
  },
  {
    "word": "theory",
    "phonetic": "/ˈθɪə.ri/",
    "partOfSpeech": "noun",
    "definition": "A supposition or a system of ideas intended to explain something.",
    "exampleSentence": "Einstein formulated the general theory of relativity to describe gravitation.",
    "synonyms": [
      "hypothesis",
      "concept",
      "principle",
      "philosophy"
    ],
    "antonyms": [
      "practice",
      "reality",
      "fact"
    ],
    "difficulty": "B1"
  },
  {
    "word": "traditional",
    "phonetic": "/trəˈdɪʃ.ən.əl/",
    "partOfSpeech": "adjective",
    "definition": "Existing in or as part of a tradition; long-established.",
    "exampleSentence": "Traditional classroom lectures are increasingly supplemented by interactive digital media.",
    "synonyms": [
      "conventional",
      "customary",
      "classical",
      "orthodox"
    ],
    "antonyms": [
      "modern",
      "unconventional",
      "innovative"
    ],
    "difficulty": "B1"
  },
  {
    "word": "varied",
    "phonetic": "/ˈveə.rid/",
    "partOfSpeech": "adjective",
    "definition": "Incorporating a number of different types or elements; showing variety.",
    "exampleSentence": "The course curriculum offers a varied selection of elective modules.",
    "synonyms": [
      "diverse",
      "assorted",
      "multifaceted",
      "heterogeneous"
    ],
    "antonyms": [
      "uniform",
      "monotonous",
      "homogeneous"
    ],
    "difficulty": "B1"
  },
  {
    "word": "volume",
    "phonetic": "/ˈvɒl.juːm/",
    "partOfSpeech": "noun",
    "definition": "The amount of space that a substance or object occupies.",
    "exampleSentence": "The beaker was filled with a precise volume of distilled water.",
    "synonyms": [
      "capacity",
      "quantity",
      "amount",
      "mass"
    ],
    "antonyms": [],
    "difficulty": "B1"
  },
  {
    "word": "welfare",
    "phonetic": "/ˈwel.feər/",
    "partOfSpeech": "noun",
    "definition": "The health, happiness, and fortunes of a person or group.",
    "exampleSentence": "The government introduced new reforms to protect child welfare and family health.",
    "synonyms": [
      "well-being",
      "prosperity",
      "health",
      "fortune"
    ],
    "antonyms": [
      "hardship",
      "misery",
      "deprivation"
    ],
    "difficulty": "B1"
  },
  {
    "word": "accommodate",
    "phonetic": "/əˈkɒm.ə.deɪt/",
    "partOfSpeech": "verb",
    "definition": "To fit in with the wishes or needs of; to provide sufficient space for.",
    "exampleSentence": "The new lecture hall was constructed to accommodate up to five hundred students.",
    "synonyms": [
      "house",
      "lodge",
      "adapt",
      "harbor"
    ],
    "antonyms": [
      "reject",
      "turn away"
    ],
    "difficulty": "B2"
  },
  {
    "word": "accumulate",
    "phonetic": "/əˈkjuː.mjə.leɪt/",
    "partOfSpeech": "verb",
    "definition": "To gather together or acquire an increasing number or quantity of.",
    "exampleSentence": "Toxins tend to accumulate in fatty tissues over extended lifespans.",
    "synonyms": [
      "amass",
      "gather",
      "collect",
      "aggregate"
    ],
    "antonyms": [
      "disperse",
      "dissipate",
      "scatter"
    ],
    "difficulty": "B2"
  },
  {
    "word": "advocate",
    "phonetic": "/ˈæd.və.keɪt/",
    "partOfSpeech": "verb",
    "definition": "To publicly recommend or support a particular cause or policy.",
    "exampleSentence": "Environmental scientists advocate for an accelerated transition toward solar power.",
    "synonyms": [
      "champion",
      "support",
      "endorse",
      "promote"
    ],
    "antonyms": [
      "oppose",
      "condemn",
      "discourage"
    ],
    "difficulty": "B2"
  },
  {
    "word": "allocate",
    "phonetic": "/ˈæl.ə.keɪt/",
    "partOfSpeech": "verb",
    "definition": "To distribute resources or duties for a particular purpose.",
    "exampleSentence": "The university decided to allocate twenty percent of its endowment to green initiatives.",
    "synonyms": [
      "distribute",
      "apportion",
      "assign",
      "allot"
    ],
    "antonyms": [
      "withhold",
      "confiscate"
    ],
    "difficulty": "B2"
  },
  {
    "word": "ambiguous",
    "phonetic": "/æmˈbɪɡ.ju.əs/",
    "partOfSpeech": "adjective",
    "definition": "Open to more than one interpretation; not having one obvious meaning.",
    "exampleSentence": "The wording of the contract was deliberately ambiguous to allow flexibility.",
    "synonyms": [
      "equivocal",
      "vague",
      "unclear",
      "obscure"
    ],
    "antonyms": [
      "explicit",
      "clear",
      "unambiguous",
      "lucid"
    ],
    "difficulty": "B2"
  },
  {
    "word": "anticipate",
    "phonetic": "/ænˈtɪs.ɪ.peɪt/",
    "partOfSpeech": "verb",
    "definition": "To regard as probable; to expect or predict.",
    "exampleSentence": "Economists anticipate a modest recovery in global manufacturing during the fourth quarter.",
    "synonyms": [
      "expect",
      "foresee",
      "predict",
      "forecast"
    ],
    "antonyms": [
      "doubt",
      "overlook"
    ],
    "difficulty": "B2"
  },
  {
    "word": "coherent",
    "phonetic": "/kəʊˈhɪə.rənt/",
    "partOfSpeech": "adjective",
    "definition": "Logical and consistent; forming a unified, comprehensible whole.",
    "exampleSentence": "An IELTS band 8 essay requires coherent paragraph structure and clear argumentation.",
    "synonyms": [
      "logical",
      "consistent",
      "lucid",
      "articulate"
    ],
    "antonyms": [
      "incoherent",
      "disjointed",
      "illogical"
    ],
    "difficulty": "B2"
  },
  {
    "word": "compensate",
    "phonetic": "/ˈkɒm.pən.seɪt/",
    "partOfSpeech": "verb",
    "definition": "To make up for something unwelcome or unpleasant by exerting an opposite effect.",
    "exampleSentence": "High salaries are often offered to compensate for demanding working hours.",
    "synonyms": [
      "offset",
      "reimburse",
      "counterbalance",
      "indemnify"
    ],
    "antonyms": [
      "penalize",
      "deprive"
    ],
    "difficulty": "B2"
  },
  {
    "word": "comprehensive",
    "phonetic": "/ˌkɒm.prɪˈhen.sɪv/",
    "partOfSpeech": "adjective",
    "definition": "Including or dealing with all or nearly all elements or aspects of something.",
    "exampleSentence": "The professor assigned a comprehensive survey of twentieth-century linguistics.",
    "synonyms": [
      "exhaustive",
      "thorough",
      "all-inclusive",
      "extensive"
    ],
    "antonyms": [
      "limited",
      "incomplete",
      "partial"
    ],
    "difficulty": "B2"
  },
  {
    "word": "concurrent",
    "phonetic": "/kənˈkʌr.ənt/",
    "partOfSpeech": "adjective",
    "definition": "Existing, happening, or done at the same time.",
    "exampleSentence": "The participant underwent concurrent evaluations of cognitive speed and motor coordination.",
    "synonyms": [
      "simultaneous",
      "synchronous",
      "coinciding",
      "parallel"
    ],
    "antonyms": [
      "sequential",
      "consecutive"
    ],
    "difficulty": "B2"
  },
  {
    "word": "controversial",
    "phonetic": "/ˌkɒn.trəˈvɜː.ʃəl/",
    "partOfSpeech": "adjective",
    "definition": "Giving rise or likely to give rise to public disagreement or debate.",
    "exampleSentence": "Genetic modification of staple crops remains a highly controversial subject.",
    "synonyms": [
      "disputed",
      "contentious",
      "debatable",
      "polarizing"
    ],
    "antonyms": [
      "uncontroversial",
      "harmonious",
      "undisputed"
    ],
    "difficulty": "B2"
  },
  {
    "word": "correspond",
    "phonetic": "/ˌkɒr.ɪˈspɒnd/",
    "partOfSpeech": "verb",
    "definition": "To have a close similarity, connection, or equivalence; match.",
    "exampleSentence": "The experimental observations correspond closely with theoretical mathematical models.",
    "synonyms": [
      "match",
      "correlate",
      "align",
      "parallel"
    ],
    "antonyms": [
      "differ",
      "diverge",
      "conflict"
    ],
    "difficulty": "B2"
  },
  {
    "word": "crucial",
    "phonetic": "/ˈkruː.ʃəl/",
    "partOfSpeech": "adjective",
    "definition": "Decisive or critical, especially in the success or failure of something.",
    "exampleSentence": "Early diagnosis plays a crucial role in preventing permanent cognitive impairment.",
    "synonyms": [
      "critical",
      "pivotal",
      "essential",
      "vital"
    ],
    "antonyms": [
      "trivial",
      "inconsequential",
      "minor"
    ],
    "difficulty": "B2"
  },
  {
    "word": "deduce",
    "phonetic": "/dɪˈdʒuːs/",
    "partOfSpeech": "verb",
    "definition": "To arrive at a fact or a conclusion by reasoning; draw as a logical inference.",
    "exampleSentence": "From the fossil record, paleontologists can deduce the animal's feeding habits.",
    "synonyms": [
      "infer",
      "conclude",
      "gather",
      "derive"
    ],
    "antonyms": [],
    "difficulty": "B2"
  },
  {
    "word": "diminish",
    "phonetic": "/dɪˈmɪn.ɪʃ/",
    "partOfSpeech": "verb",
    "definition": "To make or become less, smaller, or weaker.",
    "exampleSentence": "Failure to invest in public education will diminish long-term economic productivity.",
    "synonyms": [
      "reduce",
      "decrease",
      "lessen",
      "curtail"
    ],
    "antonyms": [
      "increase",
      "enhance",
      "expand",
      "boost"
    ],
    "difficulty": "B2"
  },
  {
    "word": "discrete",
    "phonetic": "/dɪˈskriːt/",
    "partOfSpeech": "adjective",
    "definition": "Individually separate and distinct.",
    "exampleSentence": "The training program is segmented into six discrete instructional units.",
    "synonyms": [
      "separate",
      "distinct",
      "individual",
      "detached"
    ],
    "antonyms": [
      "connected",
      "continuous",
      "merged"
    ],
    "difficulty": "B2"
  },
  {
    "word": "diverse",
    "phonetic": "/daɪˈvɜːs/",
    "partOfSpeech": "adjective",
    "definition": "Showing a great deal of variety; very different.",
    "exampleSentence": "The international committee represents diverse geopolitical perspectives.",
    "synonyms": [
      "varied",
      "heterogeneous",
      "multifarious",
      "assorted"
    ],
    "antonyms": [
      "uniform",
      "homogeneous",
      "identical"
    ],
    "difficulty": "B2"
  },
  {
    "word": "equate",
    "phonetic": "/ɪˈkweɪt/",
    "partOfSpeech": "verb",
    "definition": "To consider one thing to be the same as or equivalent to another.",
    "exampleSentence": "One should not equate financial prosperity directly with individual well-being.",
    "synonyms": [
      "associate",
      "liken",
      "identify",
      "parallel"
    ],
    "antonyms": [
      "differentiate",
      "distinguish"
    ],
    "difficulty": "B2"
  },
  {
    "word": "fluctuate",
    "phonetic": "/ˈflʌk.tʃu.eɪt/",
    "partOfSpeech": "verb",
    "definition": "To rise and fall irregularly in number or amount.",
    "exampleSentence": "Wholesale agricultural commodity prices fluctuate wildly depending on annual precipitation.",
    "synonyms": [
      "oscillate",
      "vary",
      "waver",
      "shift"
    ],
    "antonyms": [
      "stabilize",
      "settle"
    ],
    "difficulty": "B2"
  },
  {
    "word": "fundamental",
    "phonetic": "/ˌfʌn.dəˈmen.təl/",
    "partOfSpeech": "adjective",
    "definition": "Forming a necessary base or core; of central importance.",
    "exampleSentence": "Freedom of inquiry is a fundamental tenet of modern scientific exploration.",
    "synonyms": [
      "basic",
      "essential",
      "cardinal",
      "foundational"
    ],
    "antonyms": [
      "superficial",
      "peripheral",
      "secondary"
    ],
    "difficulty": "B2"
  },
  {
    "word": "implicit",
    "phonetic": "/ɪmˈplɪs.ɪt/",
    "partOfSpeech": "adjective",
    "definition": "Implied though not plainly expressed; understood without being stated.",
    "exampleSentence": "The editorial conveyed an implicit critique of contemporary fiscal policies.",
    "synonyms": [
      "implied",
      "tacit",
      "insinuated",
      "unspoken"
    ],
    "antonyms": [
      "explicit",
      "direct",
      "overt"
    ],
    "difficulty": "B2"
  },
  {
    "word": "indicate",
    "phonetic": "/ˈɪn.dɪ.keɪt/",
    "partOfSpeech": "verb",
    "definition": "To point out or show; to be a sign or symptom of.",
    "exampleSentence": "Preliminary telemetry records indicate a drop in turbine pressure.",
    "synonyms": [
      "signify",
      "denote",
      "demonstrate",
      "signal"
    ],
    "antonyms": [
      "conceal",
      "mislead"
    ],
    "difficulty": "B2"
  },
  {
    "word": "inherent",
    "phonetic": "/ɪnˈhɪə.rənt/",
    "partOfSpeech": "adjective",
    "definition": "Existing in something as a permanent, essential, or characteristic attribute.",
    "exampleSentence": "Every physical sport carries an inherent risk of musculoskeletal trauma.",
    "synonyms": [
      "intrinsic",
      "innate",
      "inbuilt",
      "essential"
    ],
    "antonyms": [
      "extrinsic",
      "acquired",
      "alien"
    ],
    "difficulty": "B2"
  },
  {
    "word": "innovate",
    "phonetic": "/ˈɪn.ə.veɪt/",
    "partOfSpeech": "verb",
    "definition": "To make changes in something established, especially by introducing new methods or ideas.",
    "exampleSentence": "Organizations must continually innovate to remain viable in the globalized marketplace.",
    "synonyms": [
      "modernize",
      "pioneer",
      "transform",
      "revolutionize"
    ],
    "antonyms": [
      "stagnate",
      "regress"
    ],
    "difficulty": "B2"
  },
  {
    "word": "integrate",
    "phonetic": "/ˈɪn.tɪ.ɡreɪt/",
    "partOfSpeech": "verb",
    "definition": "To combine one thing with another so that they become a whole.",
    "exampleSentence": "The new software module aims to integrate artificial intelligence into academic grading.",
    "synonyms": [
      "merge",
      "incorporate",
      "unify",
      "assimilate"
    ],
    "antonyms": [
      "segregate",
      "separate",
      "isolate"
    ],
    "difficulty": "B2"
  },
  {
    "word": "maximize",
    "phonetic": "/ˈmæk.sɪ.maɪz/",
    "partOfSpeech": "verb",
    "definition": "To make as large or great as possible; to use to the best advantage.",
    "exampleSentence": "Efficient scheduling allows students to maximize study hours before finals.",
    "synonyms": [
      "optimize",
      "augment",
      "boost",
      "elevate"
    ],
    "antonyms": [
      "minimize",
      "diminish",
      "reduce"
    ],
    "difficulty": "B2"
  },
  {
    "word": "modify",
    "phonetic": "/ˈmɒd.ɪ.faɪ/",
    "partOfSpeech": "verb",
    "definition": "To make partial or minor changes to something, typically so as to improve it.",
    "exampleSentence": "The engineering firm had to modify its turbine blueprint to comply with emission standards.",
    "synonyms": [
      "alter",
      "adapt",
      "adjust",
      "revise"
    ],
    "antonyms": [
      "maintain",
      "preserve"
    ],
    "difficulty": "B2"
  },
  {
    "word": "perceive",
    "phonetic": "/pəˈsiːv/",
    "partOfSpeech": "verb",
    "definition": "To become aware or conscious of something; to interpret or regard in a specified way.",
    "exampleSentence": "Many consumers perceive organically grown food as being substantially healthier.",
    "synonyms": [
      "regard",
      "discern",
      "apprehend",
      "view"
    ],
    "antonyms": [
      "misunderstand",
      "overlook"
    ],
    "difficulty": "B2"
  },
  {
    "word": "preliminary",
    "phonetic": "/prɪˈlɪm.ɪ.nər.i/",
    "partOfSpeech": "adjective",
    "definition": "Denoting an action or event preceding or done in preparation for something fuller.",
    "exampleSentence": "Preliminary clinical trials revealed promising efficacy against the pathogen.",
    "synonyms": [
      "introductory",
      "preparatory",
      "initial",
      "exploratory"
    ],
    "antonyms": [
      "final",
      "conclusive",
      "ultimate"
    ],
    "difficulty": "B2"
  },
  {
    "word": "predominant",
    "phonetic": "/prɪˈdɒm.ɪ.nənt/",
    "partOfSpeech": "adjective",
    "definition": "Present as the strongest or main element.",
    "exampleSentence": "English is the predominant medium of international scholarly publishing.",
    "synonyms": [
      "prevalent",
      "dominant",
      "paramount",
      "commanding"
    ],
    "antonyms": [
      "subordinate",
      "minor",
      "secondary"
    ],
    "difficulty": "B2"
  },
  {
    "word": "promote",
    "phonetic": "/prəˈməʊt/",
    "partOfSpeech": "verb",
    "definition": "To support or actively encourage a cause, venture, or process.",
    "exampleSentence": "Governments should promote public transport infrastructure to lower carbon emissions.",
    "synonyms": [
      "encourage",
      "advance",
      "foster",
      "champion"
    ],
    "antonyms": [
      "discourage",
      "hinder",
      "obstruct"
    ],
    "difficulty": "B2"
  },
  {
    "word": "reinforce",
    "phonetic": "/ˌriː.ɪnˈfɔːs/",
    "partOfSpeech": "verb",
    "definition": "To strengthen or support an object, argument, or structure with additional evidence.",
    "exampleSentence": "Recent climate satellite data reinforce earlier simulations of polar ice depletion.",
    "synonyms": [
      "strengthen",
      "fortify",
      "bolster",
      "buttress"
    ],
    "antonyms": [
      "undermine",
      "weaken",
      "enfeeble"
    ],
    "difficulty": "B2"
  },
  {
    "word": "retain",
    "phonetic": "/rɪˈteɪn/",
    "partOfSpeech": "verb",
    "definition": "To continue to have or keep in possession; to absorb and continue to hold.",
    "exampleSentence": "Mature ecosystems retain substantial volumes of moisture during dry seasons.",
    "synonyms": [
      "preserve",
      "maintain",
      "hold",
      "keep"
    ],
    "antonyms": [
      "relinquish",
      "lose",
      "surrender"
    ],
    "difficulty": "B2"
  },
  {
    "word": "shift",
    "phonetic": "/ʃɪft/",
    "partOfSpeech": "noun",
    "definition": "A slight change in position, direction, or tendency.",
    "exampleSentence": "The past decade has witnessed a dramatic shift toward renewable wind power.",
    "synonyms": [
      "alteration",
      "transition",
      "movement",
      "modification"
    ],
    "antonyms": [
      "stagnation",
      "permanence"
    ],
    "difficulty": "B2"
  },
  {
    "word": "subordinate",
    "phonetic": "/səˈbɔː.dɪ.nət/",
    "partOfSpeech": "adjective",
    "definition": "Lower in rank or position; secondary in importance.",
    "exampleSentence": "Individual preferences must occasionally be subordinate to community health imperatives.",
    "synonyms": [
      "secondary",
      "inferior",
      "ancillary",
      "subsidiary"
    ],
    "antonyms": [
      "superior",
      "primary",
      "dominant"
    ],
    "difficulty": "B2"
  },
  {
    "word": "sustain",
    "phonetic": "/səˈsteɪn/",
    "partOfSpeech": "verb",
    "definition": "To strengthen or support physically or mentally; to keep in existence.",
    "exampleSentence": "Without additional fiscal grants, the lab cannot sustain its ongoing longitudinal inquiry.",
    "synonyms": [
      "maintain",
      "prolong",
      "support",
      "preserve"
    ],
    "antonyms": [
      "terminate",
      "discontinue",
      "cease"
    ],
    "difficulty": "B2"
  },
  {
    "word": "trigger",
    "phonetic": "/ˈtrɪɡ.ər/",
    "partOfSpeech": "verb",
    "definition": "To cause an event or situation to happen or exist.",
    "exampleSentence": "Extreme drought events can trigger widespread geopolitical unrest and migration.",
    "synonyms": [
      "precipitate",
      "spark",
      "instigate",
      "provoke"
    ],
    "antonyms": [
      "halt",
      "prevent",
      "inhibit"
    ],
    "difficulty": "B2"
  },
  {
    "word": "undergo",
    "phonetic": "/ˌʌn.dəˈɡəʊ/",
    "partOfSpeech": "verb",
    "definition": "To experience or be subjected to something, typically arduous.",
    "exampleSentence": "All medical candidates must undergo rigorous psychological evaluations.",
    "synonyms": [
      "experience",
      "endure",
      "bear",
      "withstand"
    ],
    "antonyms": [],
    "difficulty": "B2"
  },
  {
    "word": "utilize",
    "phonetic": "/ˈjuː.tɪ.laɪz/",
    "partOfSpeech": "verb",
    "definition": "To make practical and effective use of something.",
    "exampleSentence": "Modern logistics networks utilize predictive analytics to minimize transit delays.",
    "synonyms": [
      "employ",
      "harness",
      "apply",
      "exploit"
    ],
    "antonyms": [
      "waste",
      "misuse",
      "neglect"
    ],
    "difficulty": "B2"
  },
  {
    "word": "voluntary",
    "phonetic": "/ˈvɒl.ən.tr.i/",
    "partOfSpeech": "adjective",
    "definition": "Done, given, or acting of one's own free will.",
    "exampleSentence": "Participation in the cognitive memory study was entirely voluntary for undergraduates.",
    "synonyms": [
      "discretionary",
      "unforced",
      "optional",
      "spontaneous"
    ],
    "antonyms": [
      "compulsory",
      "mandatory",
      "obligatory"
    ],
    "difficulty": "B2"
  },
  {
    "word": "exacerbate",
    "phonetic": "/ɪɡˈzæs.ə.beɪt/",
    "partOfSpeech": "verb",
    "definition": "To make a problem, bad situation, or negative feeling worse.",
    "exampleSentence": "Rising temperatures exacerbate existing water scarcity problems in arid zones.",
    "synonyms": [
      "aggravate",
      "worsen",
      "inflame",
      "compound"
    ],
    "antonyms": [
      "alleviate",
      "mitigate",
      "improve",
      "ameliorate"
    ],
    "difficulty": "C1"
  },
  {
    "word": "substantiate",
    "phonetic": "/səbˈstæn.ʃi.eɪt/",
    "partOfSpeech": "verb",
    "definition": "To provide evidence to support or prove the truth of something.",
    "exampleSentence": "The academic panel required the researcher to substantiate his claims with raw sensor logs.",
    "synonyms": [
      "corroborate",
      "validate",
      "verify",
      "authenticate"
    ],
    "antonyms": [
      "refute",
      "disprove",
      "debunk"
    ],
    "difficulty": "C1"
  },
  {
    "word": "mitigate",
    "phonetic": "/ˈmɪt.ɪ.ɡeɪt/",
    "partOfSpeech": "verb",
    "definition": "To make less severe, serious, or painful.",
    "exampleSentence": "Strategic urban tree planting can mitigate the harmful effects of urban heat islands.",
    "synonyms": [
      "alleviate",
      "lessen",
      "moderate",
      "dampen"
    ],
    "antonyms": [
      "exacerbate",
      "intensify",
      "aggravate"
    ],
    "difficulty": "C1"
  },
  {
    "word": "ubiquitous",
    "phonetic": "/juːˈbɪk.wɪ.təs/",
    "partOfSpeech": "adjective",
    "definition": "Present, appearing, or found everywhere simultaneously.",
    "exampleSentence": "Microplastics have become ubiquitous contaminants across marine and freshwater ecosystems.",
    "synonyms": [
      "omnipresent",
      "pervasive",
      "universal",
      "everywhere"
    ],
    "antonyms": [
      "rare",
      "scarce",
      "uncommon"
    ],
    "difficulty": "C1"
  },
  {
    "word": "anomaly",
    "phonetic": "/əˈnɒm.ə.li/",
    "partOfSpeech": "noun",
    "definition": "Something that deviates from what is standard, normal, or expected.",
    "exampleSentence": "The spectrometer revealed a curious chemical anomaly in the upper atmospheric readings.",
    "synonyms": [
      "irregularity",
      "aberration",
      "peculiarity",
      "deviation"
    ],
    "antonyms": [
      "normality",
      "regularity",
      "conformity"
    ],
    "difficulty": "C1"
  },
  {
    "word": "precarious",
    "phonetic": "/prɪˈkeə.ri.əs/",
    "partOfSpeech": "adjective",
    "definition": "Not securely held or in position; dangerously likely to fall or collapse.",
    "exampleSentence": "Many developing economies occupy a precarious fiscal position due to currency devaluation.",
    "synonyms": [
      "hazardous",
      "perilous",
      "insecure",
      "unstable"
    ],
    "antonyms": [
      "secure",
      "stable",
      "safe",
      "firm"
    ],
    "difficulty": "C1"
  },
  {
    "word": "corroborate",
    "phonetic": "/kəˈrɒb.ə.reɪt/",
    "partOfSpeech": "verb",
    "definition": "To confirm or give support to a statement, theory, or finding.",
    "exampleSentence": "Independent laboratory tests corroborate the presence of subterranean thermal vents.",
    "synonyms": [
      "confirm",
      "validate",
      "substantiate",
      "endorse"
    ],
    "antonyms": [
      "contradict",
      "disprove",
      "refute"
    ],
    "difficulty": "C1"
  },
  {
    "word": "paradox",
    "phonetic": "/ˈpær.ə.dɒks/",
    "partOfSpeech": "noun",
    "definition": "A seemingly absurd or self-contradictory statement that may prove well founded.",
    "exampleSentence": "The economic paradox of thrift demonstrates that aggregate saving can depress overall demand.",
    "synonyms": [
      "contradiction",
      "incongruity",
      "oxymoron",
      "enigma"
    ],
    "antonyms": [],
    "difficulty": "C1"
  },
  {
    "word": "paradigm",
    "phonetic": "/ˈpær.ə.daɪm/",
    "partOfSpeech": "noun",
    "definition": "A typical example, pattern, or philosophical framework of ideas.",
    "exampleSentence": "Quantum computing represents an entirely revolutionary computational paradigm.",
    "synonyms": [
      "model",
      "archetype",
      "framework",
      "standard"
    ],
    "antonyms": [],
    "difficulty": "C1"
  },
  {
    "word": "plausible",
    "phonetic": "/ˈplɔː.zə.bəl/",
    "partOfSpeech": "adjective",
    "definition": "Of an argument or statement appearing reasonable or probable.",
    "exampleSentence": "The team offered a plausible hypothesis explaining why the bacterial strain survived heat stress.",
    "synonyms": [
      "credible",
      "believable",
      "convincing",
      "tenable"
    ],
    "antonyms": [
      "implausible",
      "unbelievable",
      "dubious"
    ],
    "difficulty": "C1"
  },
  {
    "word": "pragmatic",
    "phonetic": "/præɡˈmæt.ɪk/",
    "partOfSpeech": "adjective",
    "definition": "Dealing with things sensibly and realistically based on practical considerations.",
    "exampleSentence": "A pragmatic approach to renewable energy deployment integrates intermittent solar with stable geothermal sources.",
    "synonyms": [
      "practical",
      "sensible",
      "utilitarian",
      "matter-of-fact"
    ],
    "antonyms": [
      "idealistic",
      "impractical",
      "dogmatic"
    ],
    "difficulty": "C1"
  },
  {
    "word": "resilient",
    "phonetic": "/rɪˈzɪl.jənt/",
    "partOfSpeech": "adjective",
    "definition": "Able to withstand or recover quickly from difficult conditions.",
    "exampleSentence": "Coastal wetlands act as resilient natural buffers against severe ocean storms.",
    "synonyms": [
      "robust",
      "tenacious",
      "tough",
      "durable"
    ],
    "antonyms": [
      "fragile",
      "vulnerable",
      "brittle"
    ],
    "difficulty": "C1"
  },
  {
    "word": "synthesize",
    "phonetic": "/ˈsɪn.θə.saɪz/",
    "partOfSpeech": "verb",
    "definition": "To combine a number of things into a coherent whole.",
    "exampleSentence": "Students must synthesize perspectives from multiple disciplines when writing literature reviews.",
    "synonyms": [
      "integrate",
      "amalgamate",
      "fuse",
      "blend"
    ],
    "antonyms": [
      "dissect",
      "separate",
      "fragment"
    ],
    "difficulty": "C1"
  },
  {
    "word": "unprecedented",
    "phonetic": "/ʌnˈpres.ɪ.den.tɪd/",
    "partOfSpeech": "adjective",
    "definition": "Never done or known before; extraordinary.",
    "exampleSentence": "The global economy experienced an unprecedented surge in digital transactions during 2020.",
    "synonyms": [
      "unparalleled",
      "novel",
      "unmatched",
      "extraordinary"
    ],
    "antonyms": [
      "precedented",
      "commonplace",
      "familiar"
    ],
    "difficulty": "C1"
  },
  {
    "word": "volatile",
    "phonetic": "/ˈvɒl.ə.taɪl/",
    "partOfSpeech": "adjective",
    "definition": "Liable to change rapidly and unpredictably, especially for the worse.",
    "exampleSentence": "Geopolitical tensions have created an extremely volatile international energy market.",
    "synonyms": [
      "unstable",
      "fickle",
      "turbulent",
      "erratic"
    ],
    "antonyms": [
      "stable",
      "constant",
      "steady",
      "tranquil"
    ],
    "difficulty": "C1"
  },
  {
    "word": "disparity",
    "phonetic": "/dɪˈspær.ə.ti/",
    "partOfSpeech": "noun",
    "definition": "A great difference or noticeable inequality between two or more things.",
    "exampleSentence": "The report drew attention to the growing economic disparity between rural and metropolitan populations.",
    "synonyms": [
      "imbalance",
      "inequality",
      "discrepancy",
      "divergence"
    ],
    "antonyms": [
      "parity",
      "equality",
      "similarity"
    ],
    "difficulty": "C1"
  },
  {
    "word": "prolific",
    "phonetic": "/prəˈlɪf.ɪk/",
    "partOfSpeech": "adjective",
    "definition": "Producing much fruit or foliage or many works of art, literature, or research.",
    "exampleSentence": "The prolific neuroscientist published over forty peer-reviewed monographs in a single decade.",
    "synonyms": [
      "productive",
      "fruitful",
      "fertile",
      "abundant"
    ],
    "antonyms": [
      "unproductive",
      "barren",
      "sterile"
    ],
    "difficulty": "C1"
  },
  {
    "word": "lucid",
    "phonetic": "/ˈluː.sɪd/",
    "partOfSpeech": "adjective",
    "definition": "Expressed clearly; easy to understand; showing clear thinking.",
    "exampleSentence": "The professor delivered a lucid exposition of mathematical group theory.",
    "synonyms": [
      "transparent",
      "coherent",
      "articulate",
      "intelligible"
    ],
    "antonyms": [
      "obscure",
      "confusing",
      "opaque"
    ],
    "difficulty": "C1"
  },
  {
    "word": "intrinsic",
    "phonetic": "/ɪnˈtrɪn.zɪk/",
    "partOfSpeech": "adjective",
    "definition": "Belonging naturally; essential to the character or constitution of something.",
    "exampleSentence": "Creativity is an intrinsic component of human intellectual development.",
    "synonyms": [
      "inherent",
      "innate",
      "fundamental",
      "immanent"
    ],
    "antonyms": [
      "extrinsic",
      "alien",
      "peripheral"
    ],
    "difficulty": "C1"
  },
  {
    "word": "scrutinize",
    "phonetic": "/ˈskruː.tɪ.naɪz/",
    "partOfSpeech": "verb",
    "definition": "To examine or inspect closely and thoroughly.",
    "exampleSentence": "Government regulators will rigorously scrutinize the prospective corporate merger.",
    "synonyms": [
      "inspect",
      "examine",
      "audit",
      "dissect"
    ],
    "antonyms": [
      "glance",
      "skim",
      "ignore"
    ],
    "difficulty": "C1"
  },
  {
    "word": "repudiate",
    "phonetic": "/rɪˈpjuː.di.eɪt/",
    "partOfSpeech": "verb",
    "definition": "To refuse to accept or be associated with; deny the truth or validity of.",
    "exampleSentence": "The minister took swift action to repudiate false allegations regarding public procurement.",
    "synonyms": [
      "reject",
      "disavow",
      "renounce",
      "dismiss"
    ],
    "antonyms": [
      "accept",
      "endorse",
      "embrace"
    ],
    "difficulty": "C1"
  },
  {
    "word": "obsolete",
    "phonetic": "/ˈɒb.sə.liːt/",
    "partOfSpeech": "adjective",
    "definition": "No longer produced or used; out of date.",
    "exampleSentence": "Advancements in microprocessing have rendered legacy vacuum tubes largely obsolete.",
    "synonyms": [
      "outdated",
      "archaic",
      "antiquated",
      "superseded"
    ],
    "antonyms": [
      "modern",
      "contemporary",
      "current"
    ],
    "difficulty": "C1"
  },
  {
    "word": "bolster",
    "phonetic": "/ˈbəʊl.stər/",
    "partOfSpeech": "verb",
    "definition": "To support or strengthen; prop up.",
    "exampleSentence": "Statistical data from three nationwide surveys bolster the researcher's core premise.",
    "synonyms": [
      "buttress",
      "reinforce",
      "fortify",
      "strengthen"
    ],
    "antonyms": [
      "undermine",
      "weaken",
      "enfeeble"
    ],
    "difficulty": "C1"
  },
  {
    "word": "delineate",
    "phonetic": "/dɪˈlɪn.i.eɪt/",
    "partOfSpeech": "verb",
    "definition": "To describe or portray something precisely; outline clearly.",
    "exampleSentence": "The environmental blueprint delineates strict conservation boundaries around the estuary.",
    "synonyms": [
      "outline",
      "depict",
      "specify",
      "demarcate"
    ],
    "antonyms": [
      "obscure",
      "distort",
      "blur"
    ],
    "difficulty": "C1"
  },
  {
    "word": "equivocal",
    "phonetic": "/ɪˈkwɪv.ə.kəl/",
    "partOfSpeech": "adjective",
    "definition": "Open to more than one interpretation; deliberately ambiguous.",
    "exampleSentence": "The committee released an equivocal statement that left foreign observers perplexed.",
    "synonyms": [
      "ambiguous",
      "vague",
      "noncommittal",
      "obscure"
    ],
    "antonyms": [
      "unambiguous",
      "unequivocal",
      "clear"
    ],
    "difficulty": "C1"
  },
  {
    "word": "intermittent",
    "phonetic": "/ˌɪn.təˈmɪt.ənt/",
    "partOfSpeech": "adjective",
    "definition": "Occurring at irregular intervals; not continuous or steady.",
    "exampleSentence": "The turbine sensors recorded intermittent power surges throughout the nocturnal storm.",
    "synonyms": [
      "sporadic",
      "periodic",
      "fitful",
      "erratic"
    ],
    "antonyms": [
      "continuous",
      "constant",
      "steady"
    ],
    "difficulty": "C1"
  },
  {
    "word": "lucrative",
    "phonetic": "/ˈluː.krə.tɪv/",
    "partOfSpeech": "adjective",
    "definition": "Producing a great deal of profit; commercially gainful.",
    "exampleSentence": "Biomedical patent licensing has become an exceptionally lucrative revenue stream for universities.",
    "synonyms": [
      "profitable",
      "gainful",
      "remunerative",
      "rewarding"
    ],
    "antonyms": [
      "unprofitable",
      "lossmaking"
    ],
    "difficulty": "C1"
  },
  {
    "word": "ostensible",
    "phonetic": "/ɒsˈten.sə.bəl/",
    "partOfSpeech": "adjective",
    "definition": "Stated or appearing to be true, but not necessarily so.",
    "exampleSentence": "The ostensible motive for the diplomatic envoy was cultural exchange, though trade talks dominated.",
    "synonyms": [
      "apparent",
      "professed",
      "alleged",
      "supposed"
    ],
    "antonyms": [
      "actual",
      "genuine",
      "real"
    ],
    "difficulty": "C1"
  },
  {
    "word": "pervasive",
    "phonetic": "/pəˈveɪ.sɪv/",
    "partOfSpeech": "adjective",
    "definition": "Spreading widely throughout an area or a group of people.",
    "exampleSentence": "The pervasive influence of algorithmic social feeds shapes contemporary teenage psychology.",
    "synonyms": [
      "omnipresent",
      "widespread",
      "ubiquitous",
      "invasive"
    ],
    "antonyms": [
      "isolated",
      "confined",
      "localized"
    ],
    "difficulty": "C1"
  },
  {
    "word": "rectify",
    "phonetic": "/ˈrek.tɪ.faɪ/",
    "partOfSpeech": "verb",
    "definition": "To put right or correct an error or defect.",
    "exampleSentence": "The software engineering cohort deployed an emergency patch to rectify the database deadlock.",
    "synonyms": [
      "correct",
      "remedy",
      "resolve",
      "amend"
    ],
    "antonyms": [
      "worsen",
      "aggravate"
    ],
    "difficulty": "C1"
  },
  {
    "word": "tenuous",
    "phonetic": "/ˈten.ju.əs/",
    "partOfSpeech": "adjective",
    "definition": "Very weak, slight, or insubstantial.",
    "exampleSentence": "Scholars criticized the tenuous historical links drawn between the two ancient civilizations.",
    "synonyms": [
      "fragile",
      "shaky",
      "flimsy",
      "insubstantial"
    ],
    "antonyms": [
      "robust",
      "solid",
      "substantial"
    ],
    "difficulty": "C1"
  },
  {
    "word": "circumvent",
    "phonetic": "/ˌsɜː.kəmˈvent/",
    "partOfSpeech": "verb",
    "definition": "To find a way around an obstacle or rule, often through cleverness.",
    "exampleSentence": "Multinational conglomerates frequently exploit loopholes to circumvent statutory corporate taxes.",
    "synonyms": [
      "bypass",
      "evade",
      "sidestep",
      "dodge"
    ],
    "antonyms": [
      "confront",
      "obey",
      "comply"
    ],
    "difficulty": "C1"
  },
  {
    "word": "detrimental",
    "phonetic": "/ˌdet.rɪˈmen.təl/",
    "partOfSpeech": "adjective",
    "definition": "Tending to cause harm or adverse consequences.",
    "exampleSentence": "Excessive sleep deprivation has a severely detrimental impact on academic retention.",
    "synonyms": [
      "harmful",
      "injurious",
      "deleterious",
      "adverse"
    ],
    "antonyms": [
      "beneficial",
      "advantageous",
      "salutary"
    ],
    "difficulty": "C1"
  },
  {
    "word": "emulate",
    "phonetic": "/ˈem.jə.leɪt/",
    "partOfSpeech": "verb",
    "definition": "To match or surpass a person or achievement, typically by imitation.",
    "exampleSentence": "Developing tech hubs strive to emulate the venture capital ecosystem of Silicon Valley.",
    "synonyms": [
      "imitate",
      "mirror",
      "reproduce",
      "follow"
    ],
    "antonyms": [],
    "difficulty": "C1"
  },
  {
    "word": "fallacious",
    "phonetic": "/fəˈleɪ.ʃəs/",
    "partOfSpeech": "adjective",
    "definition": "Based on a mistaken belief or unsound reasoning.",
    "exampleSentence": "The debater relied on a fallacious syllogism that conflated statistical correlation with causal effect.",
    "synonyms": [
      "erroneous",
      "spurious",
      "flawed",
      "specious"
    ],
    "antonyms": [
      "valid",
      "sound",
      "accurate",
      "cogent"
    ],
    "difficulty": "C1"
  },
  {
    "word": "garner",
    "phonetic": "/ˈɡɑː.nər/",
    "partOfSpeech": "verb",
    "definition": "To gather or collect something, especially information or approval.",
    "exampleSentence": "The young geneticist's dissertation managed to garner prestigious international accolades.",
    "synonyms": [
      "accumulate",
      "amass",
      "acquire",
      "reap"
    ],
    "antonyms": [
      "dissipate",
      "scatter",
      "disperse"
    ],
    "difficulty": "C1"
  },
  {
    "word": "juxtapose",
    "phonetic": "/ˌdʒʌk.stəˈpəʊz/",
    "partOfSpeech": "verb",
    "definition": "To place or deal with close together for contrasting effect.",
    "exampleSentence": "The visual artist chose to juxtapose rural pastoral scenes with harsh industrial machinery.",
    "synonyms": [
      "contrast",
      "collocate",
      "compare",
      "pair"
    ],
    "antonyms": [
      "separate",
      "isolate"
    ],
    "difficulty": "C1"
  },
  {
    "word": "malleable",
    "phonetic": "/ˈmæl.i.ə.bəl/",
    "partOfSpeech": "adjective",
    "definition": "Easily influenced, trained, or controlled; pliable.",
    "exampleSentence": "Cognitive neuroscientists observe that human synaptic circuits remain remarkably malleable in childhood.",
    "synonyms": [
      "pliable",
      "adaptable",
      "ductile",
      "impressionable"
    ],
    "antonyms": [
      "rigid",
      "inflexible",
      "unyielding"
    ],
    "difficulty": "C1"
  },
  {
    "word": "perpetuate",
    "phonetic": "/pəˈpetʃ.u.eɪt/",
    "partOfSpeech": "verb",
    "definition": "To make something, typically an undesirable situation, continue indefinitely.",
    "exampleSentence": "Unchecked institutional bias can perpetuate socio-economic inequality across generations.",
    "synonyms": [
      "prolong",
      "sustain",
      "continue",
      "maintain"
    ],
    "antonyms": [
      "terminate",
      "halt",
      "extinguish"
    ],
    "difficulty": "C1"
  },
  {
    "word": "catalyst",
    "phonetic": "/ˈkæt.əl.ɪst/",
    "partOfSpeech": "noun",
    "definition": "A person or thing that precipitates an event or change.",
    "exampleSentence": "The invention of the steam engine was a vital catalyst for the industrial revolution.",
    "synonyms": [
      "stimulus",
      "impetus",
      "spark",
      "trigger"
    ],
    "antonyms": [
      "inhibitor",
      "deterrent"
    ],
    "difficulty": "C1"
  },
  {
    "word": "ephemeral",
    "phonetic": "/ɪˈfem.ər.əl/",
    "partOfSpeech": "adjective",
    "definition": "Lasting for a very short time; transitory.",
    "exampleSentence": "Social media trends often exert an ephemeral influence on youth culture.",
    "synonyms": [
      "transitory",
      "fleeting",
      "transient",
      "evanescent"
    ],
    "antonyms": [
      "permanent",
      "enduring",
      "perpetual",
      "everlasting"
    ],
    "difficulty": "C2"
  },
  {
    "word": "esoteric",
    "phonetic": "/ˌes.əˈter.ɪk/",
    "partOfSpeech": "adjective",
    "definition": "Intended for or likely to be understood by only a small number of people with specialized knowledge.",
    "exampleSentence": "Quantum chromodynamics remains an esoteric branch of theoretical physics.",
    "synonyms": [
      "arcane",
      "recondite",
      "abstruse",
      "obscure"
    ],
    "antonyms": [
      "accessible",
      "commonplace",
      "familiar",
      "exoteric"
    ],
    "difficulty": "C2"
  },
  {
    "word": "mercurial",
    "phonetic": "/mɜːˈkjʊə.ri.əl/",
    "partOfSpeech": "adjective",
    "definition": "Subject to sudden or unpredictable changes of mood or mind; volatile.",
    "exampleSentence": "Financial markets exhibited a mercurial reaction to unexpected interest rate adjustments.",
    "synonyms": [
      "volatile",
      "capricious",
      "temperamental",
      "erratic"
    ],
    "antonyms": [
      "constant",
      "steady",
      "predictable"
    ],
    "difficulty": "C2"
  },
  {
    "word": "pernicious",
    "phonetic": "/pəˈnɪʃ.əs/",
    "partOfSpeech": "adjective",
    "definition": "Having a harmful effect, especially in a gradual or subtle way.",
    "exampleSentence": "Sedentary lifestyle habits exert a pernicious long-term influence on cardiovascular health.",
    "synonyms": [
      "insidious",
      "destructive",
      "detrimental",
      "ruinous"
    ],
    "antonyms": [
      "wholesome",
      "salubrious",
      "beneficial"
    ],
    "difficulty": "C2"
  },
  {
    "word": "sycophant",
    "phonetic": "/ˈsɪk.ə.fænt/",
    "partOfSpeech": "noun",
    "definition": "A person who acts obsequiously toward someone important in order to gain advantage.",
    "exampleSentence": "The despotic ruler surrounded himself with sycophants who concealed economic truths.",
    "synonyms": [
      "flatterer",
      "toady",
      "fawner",
      "lackey"
    ],
    "antonyms": [],
    "difficulty": "C2"
  },
  {
    "word": "quintessential",
    "phonetic": "/ˌkwɪn.tɪˈsen.ʃəl/",
    "partOfSpeech": "adjective",
    "definition": "Representing the most perfect or typical example of a quality or class.",
    "exampleSentence": "Shakespeare is widely regarded as the quintessential dramatist of the English Renaissance.",
    "synonyms": [
      "archetypal",
      "exemplary",
      "definitive",
      "prototypical"
    ],
    "antonyms": [
      "atypical",
      "uncharacteristic"
    ],
    "difficulty": "C2"
  },
  {
    "word": "recalcitrant",
    "phonetic": "/rɪˈkæl.sɪ.trənt/",
    "partOfSpeech": "adjective",
    "definition": "Having an obstinately uncooperative attitude toward authority or discipline.",
    "exampleSentence": "The recalcitrant member state refused to adhere to regional environmental quotas.",
    "synonyms": [
      "defiant",
      "unruly",
      "intractable",
      "disobedient"
    ],
    "antonyms": [
      "compliant",
      "docile",
      "amenable"
    ],
    "difficulty": "C2"
  },
  {
    "word": "surreptitious",
    "phonetic": "/ˌsʌr.əpˈtɪʃ.əs/",
    "partOfSpeech": "adjective",
    "definition": "Kept secret, especially because it would not be approved of.",
    "exampleSentence": "The investigative journalist recorded a surreptitious conversation exposing corporate embezzlement.",
    "synonyms": [
      "clandestine",
      "covert",
      "furtive",
      "stealthy"
    ],
    "antonyms": [
      "overt",
      "brazen",
      "open"
    ],
    "difficulty": "C2"
  },
  {
    "word": "vicarious",
    "phonetic": "/vɪˈkeə.ri.əs/",
    "partOfSpeech": "adjective",
    "definition": "Experienced in the imagination through the feelings or actions of another person.",
    "exampleSentence": "Biographical literature offers readers a vicarious exploration of historical struggles.",
    "synonyms": [
      "derivative",
      "indirect",
      "surrogate",
      "empathetic"
    ],
    "antonyms": [
      "direct",
      "firsthand",
      "primary"
    ],
    "difficulty": "C2"
  },
  {
    "word": "capricious",
    "phonetic": "/kəˈprɪʃ.əs/",
    "partOfSpeech": "adjective",
    "definition": "Given to sudden and unaccountable changes of mood or behavior.",
    "exampleSentence": "Agricultural yields in sub-Saharan regions suffer under capricious seasonal weather patterns.",
    "synonyms": [
      "whimsical",
      "unpredictable",
      "fickle",
      "erratic"
    ],
    "antonyms": [
      "consistent",
      "steadfast",
      "reliable"
    ],
    "difficulty": "C2"
  },
  {
    "word": "egregious",
    "phonetic": "/ɪˈɡriː.dʒəs/",
    "partOfSpeech": "adjective",
    "definition": "Outstandingly bad; shocking.",
    "exampleSentence": "The company committed an egregious violation of worker safety statutes.",
    "synonyms": [
      "flagrant",
      "atrocious",
      "abhorrent",
      "deplorable"
    ],
    "antonyms": [
      "praiseworthy",
      "commendable",
      "exemplary"
    ],
    "difficulty": "C2"
  },
  {
    "word": "obsequious",
    "phonetic": "/əbˈsiː.kwi.əs/",
    "partOfSpeech": "adjective",
    "definition": "Obedient or attentive to an excessive or servile degree.",
    "exampleSentence": "The corporate subordinates adopted an obsequious demeanor in front of executive auditors.",
    "synonyms": [
      "sycophantic",
      "subservient",
      "fawning",
      "cringing"
    ],
    "antonyms": [
      "domineering",
      "defiant",
      "imperious"
    ],
    "difficulty": "C2"
  },
  {
    "word": "dichotomy",
    "phonetic": "/daɪˈkɒt.ə.mi/",
    "partOfSpeech": "noun",
    "definition": "A division or contrast between two things represented as being opposed.",
    "exampleSentence": "The sociological lecture analyzed the stark dichotomy between urban affluence and rural poverty.",
    "synonyms": [
      "division",
      "polarity",
      "split",
      "contrast"
    ],
    "antonyms": [
      "harmony",
      "unity",
      "cohesion"
    ],
    "difficulty": "C2"
  },
  {
    "word": "obfuscate",
    "phonetic": "/ˈɒb.fʌ.skeɪt/",
    "partOfSpeech": "verb",
    "definition": "To make obscure, unclear, or unintelligible.",
    "exampleSentence": "The spokesperson attempted to obfuscate the financial ledger during the parliamentary inquiry.",
    "synonyms": [
      "cloud",
      "muddle",
      "bewilder",
      "obscure"
    ],
    "antonyms": [
      "clarify",
      "illuminate",
      "elucidate"
    ],
    "difficulty": "C2"
  },
  {
    "word": "perspicacious",
    "phonetic": "/ˌpɜː.spɪˈkeɪ.ʃəs/",
    "partOfSpeech": "adjective",
    "definition": "Having a ready insight into and understanding of things; shrewd.",
    "exampleSentence": "The perspicacious macroeconomist foresaw the impending housing bubble years prior.",
    "synonyms": [
      "astute",
      "insightful",
      "discerning",
      "perceptive"
    ],
    "antonyms": [
      "obtuse",
      "ignorant",
      "unperceptive"
    ],
    "difficulty": "C2"
  },
  {
    "word": "magnanimous",
    "phonetic": "/mæɡˈnæn.ɪ.məs/",
    "partOfSpeech": "adjective",
    "definition": "Generous or forgiving, especially toward a rival or less powerful person.",
    "exampleSentence": "Following the contentious election, the candidate gave a magnanimous concessions speech.",
    "synonyms": [
      "generous",
      "charitable",
      "benevolent",
      "forgiving"
    ],
    "antonyms": [
      "vindictive",
      "petty",
      "spiteful"
    ],
    "difficulty": "C2"
  },
  {
    "word": "intransigent",
    "phonetic": "/ɪnˈtræn.zɪ.dʒənt/",
    "partOfSpeech": "adjective",
    "definition": "Unwilling or refusing to change one's views or to agree about something.",
    "exampleSentence": "Both diplomatic delegations remained intransigent, leading to a breakdown in treaty talks.",
    "synonyms": [
      "uncompromising",
      "stubborn",
      "adamant",
      "obstinate"
    ],
    "antonyms": [
      "pliable",
      "accommodating",
      "yielding"
    ],
    "difficulty": "C2"
  },
  {
    "word": "fastidious",
    "phonetic": "/fæsˈtɪd.i.əs/",
    "partOfSpeech": "adjective",
    "definition": "Very attentive to and concerned about accuracy and detail; punctilious.",
    "exampleSentence": "Historical linguists require fastidious collation of ancient epigraphic fragments.",
    "synonyms": [
      "meticulous",
      "punctilious",
      "scrupulous",
      "painstaking"
    ],
    "antonyms": [
      "careless",
      "sloppy",
      "lax"
    ],
    "difficulty": "C2"
  },
  {
    "word": "circumlocution",
    "phonetic": "/ˌsɜː.kəm.ləˈkjuː.ʃən/",
    "partOfSpeech": "noun",
    "definition": "The use of many words where fewer would do, especially in an attempt to be evasive.",
    "exampleSentence": "The bureaucrat's circumlocution masked an unwillingness to allocate promised municipal funding.",
    "synonyms": [
      "periphrasis",
      "verbosity",
      "euphemism",
      "prolixity"
    ],
    "antonyms": [
      "conciseness",
      "brevity",
      "directness"
    ],
    "difficulty": "C2"
  },
  {
    "word": "evanescent",
    "phonetic": "/ˌev.əˈnes.ənt/",
    "partOfSpeech": "adjective",
    "definition": "Soon passing out of sight, memory, or existence; quickly fading.",
    "exampleSentence": "Morning alpine fog proved evanescent once the equatorial sun crested the mountain ridge.",
    "synonyms": [
      "fleeting",
      "transient",
      "vanishing",
      "ephemeral"
    ],
    "antonyms": [
      "enduring",
      "permanent",
      "persistent"
    ],
    "difficulty": "C2"
  },
  {
    "word": "quixotic",
    "phonetic": "/kwɪkˈsɒt.ɪk/",
    "partOfSpeech": "adjective",
    "definition": "Exceedingly idealistic; unrealistic and impractical.",
    "exampleSentence": "Attempting to reverse deep ecological damage with cosmetic municipal projects is quixotic.",
    "synonyms": [
      "idealistic",
      "visionary",
      "utopian",
      "starry-eyed"
    ],
    "antonyms": [
      "pragmatic",
      "realistic",
      "grounded"
    ],
    "difficulty": "C2"
  },
  {
    "word": "serendipitous",
    "phonetic": "/ˌser.ənˈdɪp.ɪ.təs/",
    "partOfSpeech": "adjective",
    "definition": "Occurring or discovered by chance in a happy or beneficial way.",
    "exampleSentence": "Alexander Fleming's serendipitous discovery of penicillin revolutionized twentieth-century pharmacotherapy.",
    "synonyms": [
      "chance",
      "fortuitous",
      "accidental",
      "lucky"
    ],
    "antonyms": [
      "deliberate",
      "calculated",
      "premeditated"
    ],
    "difficulty": "C2"
  },
  {
    "word": "anachronism",
    "phonetic": "/əˈnæk.rə.nɪ.zəm/",
    "partOfSpeech": "noun",
    "definition": "A thing belonging or appropriate to a period other than that in which it exists.",
    "exampleSentence": "The depiction of wristwatches in Roman imperial cinema is a blatant historical anachronism.",
    "synonyms": [
      "misplacement",
      "archaism",
      "incongruity",
      "anomaly"
    ],
    "antonyms": [],
    "difficulty": "C2"
  },
  {
    "word": "bellicose",
    "phonetic": "/ˈbel.ɪ.kəʊs/",
    "partOfSpeech": "adjective",
    "definition": "Demonstrating aggression and willingness to fight.",
    "exampleSentence": "The state broadcaster delivered a bellicose proclamation threatening retaliatory sanctions.",
    "synonyms": [
      "belligerent",
      "pugnacious",
      "combative",
      "aggressive"
    ],
    "antonyms": [
      "peaceful",
      "conciliatory",
      "pacific"
    ],
    "difficulty": "C2"
  },
  {
    "word": "coalesce",
    "phonetic": "/ˌkəʊ.əˈles/",
    "partOfSpeech": "verb",
    "definition": "To come together to form one mass or whole.",
    "exampleSentence": "Diverse dissident groups coalesced into a unified parliamentary coalition.",
    "synonyms": [
      "merge",
      "amalgamate",
      "fuse",
      "converge"
    ],
    "antonyms": [
      "fragment",
      "disperse",
      "separate"
    ],
    "difficulty": "C2"
  },
  {
    "word": "disenfranchise",
    "phonetic": "/ˌdɪs.ɪnˈfræn.tʃaɪz/",
    "partOfSpeech": "verb",
    "definition": "To deprive someone of the rights and privileges of a citizen, especially the right to vote.",
    "exampleSentence": "Gerrymandering electoral boundaries serves to systematically disenfranchise minority communities.",
    "synonyms": [
      "marginalize",
      "disempower",
      "suppress",
      "alienate"
    ],
    "antonyms": [
      "empower",
      "enfranchise"
    ],
    "difficulty": "C2"
  },
  {
    "word": "enervate",
    "phonetic": "/ˈen.ə.veɪt/",
    "partOfSpeech": "verb",
    "definition": "To cause someone to feel drained of energy or vitality; weaken.",
    "exampleSentence": "Prolonged exposure to tropical humidity can severely enervate mountaineering expeditions.",
    "synonyms": [
      "exhaust",
      "fatigue",
      "debilitate",
      "weaken"
    ],
    "antonyms": [
      "invigorate",
      "energize",
      "rejuvenate"
    ],
    "difficulty": "C2"
  },
  {
    "word": "impervious",
    "phonetic": "/ɪmˈpɜː.vi.əs/",
    "partOfSpeech": "adjective",
    "definition": "Not allowing fluid to pass through; unable to be affected by.",
    "exampleSentence": "The submarine hull was engineered from titanium alloys impervious to crushing abyssal pressures.",
    "synonyms": [
      "impenetrable",
      "impermeable",
      "invulnerable",
      "resistant"
    ],
    "antonyms": [
      "permeable",
      "vulnerable",
      "susceptible"
    ],
    "difficulty": "C2"
  },
  {
    "word": "juxtaposition",
    "phonetic": "/ˌdʒʌk.stə.pəˈzɪʃ.ən/",
    "partOfSpeech": "noun",
    "definition": "The fact of two things being seen or placed close together with contrasting effect.",
    "exampleSentence": "The museum exhibition featured a striking juxtaposition of medieval tapestries and modern digital sculptures.",
    "synonyms": [
      "contrast",
      "comparison",
      "proximity",
      "collocation"
    ],
    "antonyms": [],
    "difficulty": "C2"
  },
  {
    "word": "loquacious",
    "phonetic": "/ləˈkweɪ.ʃəs/",
    "partOfSpeech": "adjective",
    "definition": "Tending to talk a great deal; talkative.",
    "exampleSentence": "The professor's loquacious lecturing style frequently caused class seminars to run overtime.",
    "synonyms": [
      "garrulous",
      "voluble",
      "talkative",
      "verbose"
    ],
    "antonyms": [
      "laconic",
      "taciturn",
      "reticent"
    ],
    "difficulty": "C2"
  },
  {
    "word": "munificent",
    "phonetic": "/mjuːˈnɪf.ɪ.sənt/",
    "partOfSpeech": "adjective",
    "definition": "Of a gift or sum of money more generous than is usual or necessary.",
    "exampleSentence": "The university physics department received a munificent bequest from an anonymous alumnus.",
    "synonyms": [
      "bountiful",
      "generous",
      "lavish",
      "magnanimous"
    ],
    "antonyms": [
      "stingy",
      "parsimonious",
      "penurious"
    ],
    "difficulty": "C2"
  },
  {
    "word": "nefarious",
    "phonetic": "/nɪˈfeə.ri.əs/",
    "partOfSpeech": "adjective",
    "definition": "Typically of an action or activity wicked or criminal.",
    "exampleSentence": "Cybersecurity detectives intercepted a nefarious scheme orchestrating extortion across hospital networks.",
    "synonyms": [
      "wicked",
      "villainous",
      "iniquitous",
      "sinister"
    ],
    "antonyms": [
      "virtuous",
      "honorable",
      "noble"
    ],
    "difficulty": "C2"
  },
  {
    "word": "panacea",
    "phonetic": "/ˌpæn.əˈsiː.ə/",
    "partOfSpeech": "noun",
    "definition": "A solution or remedy for all difficulties or diseases.",
    "exampleSentence": "Technological innovation is valuable, but it is not a panacea for deep structural poverty.",
    "synonyms": [
      "cure-all",
      "elixir",
      "universal remedy",
      "nostrum"
    ],
    "antonyms": [],
    "difficulty": "C2"
  },
  {
    "word": "querulous",
    "phonetic": "/ˈkwer.jə.ləs/",
    "partOfSpeech": "adjective",
    "definition": "Complaining in a petulant or whining manner.",
    "exampleSentence": "Exhausted travelers grew increasingly querulous after flight departures were postponed overnight.",
    "synonyms": [
      "whiny",
      "peevish",
      "petulant",
      "fretful"
    ],
    "antonyms": [
      "content",
      "affable",
      "forbearing"
    ],
    "difficulty": "C2"
  },
  {
    "word": "reticent",
    "phonetic": "/ˈret.ɪ.sənt/",
    "partOfSpeech": "adjective",
    "definition": "Not revealing one thoughts or feelings readily; reserved.",
    "exampleSentence": "The diplomat remained reticent concerning secret negotiations taking place at the summit.",
    "synonyms": [
      "reserved",
      "withdrawn",
      "taciturn",
      "uncommunicative"
    ],
    "antonyms": [
      "garrulous",
      "expansive",
      "frank"
    ],
    "difficulty": "C2"
  },
  {
    "word": "salubrious",
    "phonetic": "/səˈluː.bri.əs/",
    "partOfSpeech": "adjective",
    "definition": "Health-giving; healthy.",
    "exampleSentence": "Victorian physicians frequently prescribed convalescence in the salubrious coastal breezes.",
    "synonyms": [
      "healthful",
      "wholesome",
      "beneficial",
      "invigorating"
    ],
    "antonyms": [
      "insalubrious",
      "unhealthy",
      "noxious"
    ],
    "difficulty": "C2"
  },
  {
    "word": "trenchant",
    "phonetic": "/ˈtren.tʃənt/",
    "partOfSpeech": "adjective",
    "definition": "Vigorous or incisive in expression or style.",
    "exampleSentence": "The literary critic offered trenchant observations exposing superficial characterization in the bestseller.",
    "synonyms": [
      "incisive",
      "penetrating",
      "scathing",
      "acute"
    ],
    "antonyms": [
      "bland",
      "vague",
      "feeble"
    ],
    "difficulty": "C2"
  },
  {
    "word": "ubiquity",
    "phonetic": "/juːˈbɪk.wɪ.ti/",
    "partOfSpeech": "noun",
    "definition": "The state or capacity of being everywhere, especially at the same time.",
    "exampleSentence": "The ubiquity of cellular computing has fundamentally restructured human interpersonal communications.",
    "synonyms": [
      "omnipresence",
      "pervasiveness",
      "universality"
    ],
    "antonyms": [
      "rarity",
      "scarcity"
    ],
    "difficulty": "C2"
  },
  {
    "word": "vacillate",
    "phonetic": "/ˈvæs.ɪ.leɪt/",
    "partOfSpeech": "verb",
    "definition": "To alternate or waver between different opinions or actions; be indecisive.",
    "exampleSentence": "The minister continued to vacillate over whether to raise carbon duties or offer corporate subsidies.",
    "synonyms": [
      "hesitate",
      "dither",
      "waver",
      "oscillate"
    ],
    "antonyms": [
      "decide",
      "resolve"
    ],
    "difficulty": "C2"
  },
  {
    "word": "zenith",
    "phonetic": "/ˈzen.ɪθ/",
    "partOfSpeech": "noun",
    "definition": "The time at which something is most powerful or successful.",
    "exampleSentence": "At the zenith of its maritime supremacy, Venice controlled lucrative Mediterranean spice routes.",
    "synonyms": [
      "pinnacle",
      "apex",
      "acme",
      "culmination"
    ],
    "antonyms": [
      "nadir",
      "bottom",
      "trough"
    ],
    "difficulty": "C2"
  }
];

export async function runVocabularySeed(): Promise<void> {
  console.log('================================================================');
  console.log('📚 SEEDING VOCABULARY BANK (Phase 15 CEFR B1 - C2)');
  console.log('================================================================');

  // Resolve IELTS Course ID dynamically (fallback to 'c3')
  const courseRes = await pgDb.query(
    `SELECT "id" FROM "courses" WHERE "code" = 'IELTS-101' LIMIT 1`
  );
  const courseId = (courseRes.rows[0] as any)?.id || 'c3';
  console.log(`Resolved IELTS Course ID: ${courseId}`);

  let insertedCount = 0;
  for (const v of SEED_VOCABULARY_WORDS) {
    const id = `vocab_${v.word.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    await pgDb.query(
      `INSERT INTO "vocabulary_words" (
        "id", "word", "phonetic", "partOfSpeech", "definition", "exampleSentence",
        "synonyms", "antonyms", "difficulty", "courseId", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "word" = EXCLUDED."word",
        "phonetic" = EXCLUDED."phonetic",
        "partOfSpeech" = EXCLUDED."partOfSpeech",
        "definition" = EXCLUDED."definition",
        "exampleSentence" = EXCLUDED."exampleSentence",
        "synonyms" = EXCLUDED."synonyms",
        "antonyms" = EXCLUDED."antonyms",
        "difficulty" = EXCLUDED."difficulty",
        "courseId" = EXCLUDED."courseId"`,
      [
        id,
        v.word,
        v.phonetic,
        v.partOfSpeech,
        v.definition,
        v.exampleSentence,
        JSON.stringify(v.synonyms),
        JSON.stringify(v.antonyms),
        v.difficulty,
        courseId,
      ]
    );
    insertedCount++;
  }

  console.log(`✅ VOCABULARY SEED COMPLETE: ${insertedCount} words successfully seeded/updated.`);
  console.log('================================================================');
}

if (require.main === module) {
  runVocabularySeed()
    .then(async () => {
      await pgDb.close();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Vocabulary seed error:', e);
      try {
        await pgDb.close();
      } catch {}
      process.exit(1);
    });
}
