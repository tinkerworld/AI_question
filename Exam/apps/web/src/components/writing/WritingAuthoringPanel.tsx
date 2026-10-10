import React, { useState, useEffect } from 'react';
import { WritingRubricCriterionDTO } from '@repo/types';

export interface WritingQuestionConfig {
  promptStem: string;
  promptImageUrl?: string;
  stimulusText?: string;
  aiVisualContext?: string;
  chartFacts?: any;
  minWords: number;
  maxWords: number;
  recommendedTimeMinutes: number;
  rubricCriteria: WritingRubricCriterionDTO[];
  sampleAnswer?: string;
  preset?: 'IELTS_TASK_1' | 'IELTS_TASK_1_GT' | 'IELTS_TASK_2' | 'TOEFL_INDEPENDENT' | 'CUSTOM';
  taskType?: string;
}

interface WritingAuthoringPanelProps {
  initialConfig?: Partial<WritingQuestionConfig>;
  onChange: (config: WritingQuestionConfig) => void;
  forcedTask?: 'TASK_1' | 'TASK_2';
}

const DEFAULT_RUBRICS: Record<string, WritingRubricCriterionDTO[]> = {
  IELTS_TASK_1: [
    { id: 'task_achievement', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Accurate overview, key features selected and illustrated with data/stages.' },
    { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical paragraph progression, cohesive devices, and sequencing.' },
    { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Accurate academic data vocabulary, proportions, verbs of change, and precision.' },
    { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of complex structures, passive forms for processes, and error-free sentences.' },
  ],
  IELTS_TASK_1_GT: [
    { id: 'task_achievement', name: 'Task Achievement (Letter)', weight: 0.25, maxScore: 9, description: 'Clear purpose of letter, all bullet points covered, appropriate tone and register.' },
    { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical sequencing, clear paragraph transitions, appropriate salutations and sign-off.' },
    { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Appropriate register, tone, idiomatic collocations for formal or informal letter.' },
    { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of sentence structures, accurate grammar, and correct punctuation.' },
  ],
  IELTS_TASK_2: [
    { id: 'task_response', name: 'Task Response', weight: 0.25, maxScore: 9, description: 'Addressing all parts of the task with clear position throughout and extended, supported ideas.' },
    { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical sequencing, clear central topic per paragraph, and linking devices.' },
    { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Range, accuracy, natural academic collocations, and sophistication of vocabulary.' },
    { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Complex sentence structures, high accuracy, punctuation control, and communicative effect.' },
  ],
};

interface PresetTemplate {
  key: string;
  name: string;
  badge: string;
  preset: 'IELTS_TASK_1' | 'IELTS_TASK_2' | 'TOEFL_INDEPENDENT';
  taskType: string;
  promptStem: string;
  promptImageUrl?: string;
  stimulusText?: string;
  minWords: number;
  maxWords: number;
  timeLimit: number;
  sampleAnswer: string;
}

const TEMPLATES: PresetTemplate[] = [
  // Task 1 Templates
  {
    key: 'task1_energy',
    name: 'Renewable Electricity (Bar Chart)',
    badge: 'Task 1 Graph',
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_GRAPH',
    promptStem: 'IELTS Academic Writing Task 1: The bar chart illustrates the proportions of renewable electricity generation (solar, wind, and hydroelectric) across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
    promptImageUrl: '/assets/charts/ielts_task1_renewable_energy.svg',
    stimulusText: 'Review the multi-nation renewable electricity generation bar chart (2010 vs 2024) across Germany, United Kingdom, France, Spain, and Norway. Highlight significant proportional shifts in solar, wind, and hydroelectric power.',
    minWords: 150,
    maxWords: 250,
    timeLimit: 20,
    sampleAnswer: 'The provided bar chart compares the percentage shares of renewable electricity generated via solar, wind, and hydroelectric sources across five European countries over a 14-year period from 2010 to 2024. Overall, renewable energy generation expanded substantially in all five nations, with wind and solar recording the most pronounced percentage gains, while hydroelectric power remained dominant in Norway.\n\nIn 2010, Norway led all surveyed nations with hydroelectricity accounting for nearly 90% of its domestic output, a proportion that remained virtually unchanged by 2024 at approximately 88%. By contrast, wind power in Denmark witnessed the steepest upward trajectory, surging from roughly 21% in 2010 to over 55% in 2024, eclipsing all other sources combined.\n\nGermany and Spain also demonstrated substantial transformations. In Germany, solar PV generation climbed from 3% to nearly 18%, while wind electricity rose from 9% to 32%. Spain exhibited a parallel diversification, with solar and wind collectively contributing over 45% of total generation in 2024 compared to under 20% in 2010. The United Kingdom experienced notable growth in offshore wind, rising from 5% to 28% across the period, underscoring a continent-wide transition toward decarbonised power grids.',
  },
  {
    key: 'task1_desalination',
    name: 'Desalination SWRO (Process Diagram)',
    badge: 'Task 1 Process',
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_PROCESS',
    promptStem: 'IELTS Academic Writing Task 1: The flow diagram illustrates the multi-stage technical process of seawater reverse osmosis desalination and municipal potable water distribution. Summarise the process by describing the main chronological stages. (Write at least 150 words).',
    promptImageUrl: '/assets/charts/ielts_task1_desalination_process.svg',
    stimulusText: 'Examine the 6-stage seawater reverse osmosis (SWRO) flow diagram: 1. Ocean Intake -> 2. Coagulation & Media Filtration -> 3. High-Pressure Booster Pump -> 4. Polyamide Membrane RO Separation -> 5. Post-Treatment Mineralization -> 6. Municipal Storage & Urban Distribution.',
    minWords: 150,
    maxWords: 250,
    timeLimit: 20,
    sampleAnswer: 'The flow diagram delineates the sequential technical stages involved in extracting, treating, and purifying ocean seawater through high-pressure reverse osmosis filtration before mineral rebalancing and municipal delivery. Overall, the desalination procedure comprises six main chronological phases, transitioning from raw marine extraction and mechanical pre-treatment to molecular membrane separation, mineral remineralisation, and final urban distribution.\n\nIn the initial stage, raw marine water is drawn through submerged ocean intake pipelines equipped with coarse velocity screens to prevent fish and debris ingress. The saline water then enters coagulation and dual-media sand filtration chambers, where suspended colloids, particulates, and organic matter are precipitated and removed.\n\nSubsequently, high-pressure booster pumps elevate the hydraulic pressure of the clarified seawater to between 60 and 80 bar to overcome natural osmotic pressure. This pressurized brine is channelled into semi-permeable spiral-wound polyamide reverse osmosis membranes, separating potable freshwater permeate from concentrated discharge brine. While concentrated effluent is safely diffused back into marine depths, the desalted permeate undergoes post-treatment disinfection, remineralization with calcium and carbonate, and pH stabilization before transfer to municipal storage reservoirs for urban consumption.',
  },
  {
    key: 'task1_co2',
    name: 'Global CO₂ Emissions (Line Graph)',
    badge: 'Task 1 Line Graph',
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_GRAPH',
    promptStem: 'IELTS Academic Writing Task 1: The line graph illustrates annual carbon dioxide (CO₂) emissions across China, the United States, the European Union, and India from 1990 to 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
    promptImageUrl: '/assets/charts/ielts_task1_global_co2_trends.svg',
    stimulusText: 'Analyze the 35-year emission trajectories of the four economic regions. Note China\'s steep upward acceleration, the EU\'s steady decumulation, the US peak and stabilization, and India\'s steady climb.',
    minWords: 150,
    maxWords: 250,
    timeLimit: 20,
    sampleAnswer: 'The line graph provides a comparative overview of annual carbon dioxide emissions in Gigatonnes (Gt) produced by China, the United States, the European Union, and India over a 35-year period between 1990 and 2025. Overall, emissions in China and India experienced continuous upward trajectories, with China undergoing remarkable exponential growth, whereas both the United States and the European Union achieved net reductions over the surveyed timeframe.\n\nIn 1990, the United States was the pre-eminent emitter at 5.0 Gt, rising to a peak of approximately 6.1 Gt in 2005 before gradually subsiding to 4.8 Gt by 2025. Conversely, the European Union demonstrated a sustained downward trajectory, descending steadily from 4.4 Gt in 1990 to 2.5 Gt in 2025, representing a total contraction of over 40%.\n\nIn stark contrast, emissions in China stood at just 2.4 Gt in 1990 before surging rapidly after 2000, ultimately reaching an unprecedented 12.4 Gt by 2025, far outstripping the other three entities combined. Finally, India recorded modest but consistent growth, ascending from 0.6 Gt in 1990 to 3.1 Gt by 2025, overtaking the European Union around 2020.',
  },
  {
    key: 'task1_pie',
    name: 'Household Spending (Comparative Pie Charts)',
    badge: 'Task 1 Pie Charts',
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_PIE',
    promptStem: 'IELTS Academic Writing Task 1: The comparative pie charts illustrate the proportion of average weekly household expenditure across six spending categories in Country X in 1975 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
    promptImageUrl: '/assets/charts/ielts_task1_household_expenditure_pie.svg',
    stimulusText: 'Compare the expenditure proportions in 1975 vs 2025 across Food & Groceries, Housing & Utilities, Transport, Tech & Telecom, Leisure, and Clothing. Note major shifts in food vs housing and tech.',
    minWords: 150,
    maxWords: 250,
    timeLimit: 20,
    sampleAnswer: 'The two pie charts compare the proportional distribution of average weekly household spending across six categories in Country X between 1975 and 2025. Overall, the fifty-year period witnessed a dramatic realignment of household budgets, characterized by a substantial contraction in food and clothing outlays alongside marked surges in expenditure on housing and digital communications technology.\n\nIn 1975, food and groceries constituted the largest single expense, commanding 35% of the total budget (£64/week), followed by housing and utilities at 22%. By 2025, however, these roles had completely inverted: housing expenditure escalated to 34% of the expanded £540 weekly budget, while food outlays shrank by more than half to 15%.\n\nThe most dramatic proportional expansion occurred in digital technology and telecommunications, which surged eight-fold from a negligible 2% in 1975 to 16% in 2025. Conversely, spending on clothing and footwear contracted from 15% to a modest 5%. Transport outlays expanded slightly from 14% to 18%, whereas leisure and recreational expenditure remained remarkably constant at exactly 12% across both benchmark years.',
  },
  {
    key: 'task1_pyramid',
    name: 'Demographic Shift (Population Pyramid)',
    badge: 'Task 1 Demographic Pyramid',
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_GRAPH',
    promptStem: 'IELTS Academic Writing Task 1: The demographic population pyramid illustrates the proportion of age cohorts and gender distributions in an industrialized nation comparing 1970 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
    promptImageUrl: '/assets/charts/ielts_task1_population_pyramid.svg',
    stimulusText: 'Review the comparative demographic pyramids for 1970 and 2024 across 6 age cohorts (0–14, 15–29, 30–44, 45–59, 60–74, 75+). Note the inversion from expansive youth base in 1970 to constricted base and ballooning elderly demographic (60+) in 2024.',
    minWords: 150,
    maxWords: 250,
    timeLimit: 20,
    sampleAnswer: 'The comparative population pyramids delineate the structural transformation in age cohorts and gender distribution within an industrialized nation between 1970 and 2024. Overall, the demographic profile underwent a dramatic transition from an expansive, youth-dominated pyramid in 1970 to a top-heavy, constrictive structure in 2024, characterized by an aging population and shrinking youth cohorts.\n\nIn 1970, children aged 0–14 constituted the largest single demographic bracket, representing 14.8% of males and 14.2% of females. By 2024, this youngest cohort had contracted substantially to just 7.4% and 7.1% respectively. Similarly, young adults aged 15–29 declined from approximately 13.5% per gender to under 9.5%.\n\nConversely, the proportion of elderly citizens expanded exponentially over the 54-year span. While seniors aged 75 and older accounted for merely 2.1% of males and 3.4% of females in 1970, their share surged to 6.8% and 8.9% by 2024. The 60–74 demographic exhibited a parallel surge, expanding from around 6.5% to over 11.5% for both sexes. Across both benchmark years, female life expectancy advantages were evident in the oldest age tiers.',
  },
  {
    key: 'task1_airport',
    name: 'Airport Terminal Expansion (Comparative Maps)',
    badge: 'Task 1 Redevelopment Map',
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_MAP',
    promptStem: 'IELTS Academic Writing Task 1: The two maps illustrate the layout of an international airport terminal in 2010 and following substantial structural redevelopment in 2024. Summarise the changes by describing the main reconfigurations and newly added transit infrastructure. (Write at least 150 words).',
    promptImageUrl: '/assets/charts/ielts_task1_airport_redevelopment.svg',
    stimulusText: 'Examine the 2010 vs 2024 airport terminal layouts. Identify the expansion from 8 linear boarding gates to 18 gates across two new Y-shaped concourses, the replacement of ground parking with a multi-storey parkade, and the addition of a high-speed underground metro link.',
    minWords: 150,
    maxWords: 250,
    timeLimit: 20,
    sampleAnswer: 'The two maps delineate the architectural modernization and physical expansion of an international airport terminal between 2010 and 2024. Overall, the facility underwent extensive modernization, transforming from a modest single-concourse terminal with surface parking into a high-capacity dual-concourse hub integrated with subterranean rail transit.\n\nIn 2010, the airport featured a simple linear design with eight boarding gates situated along a single northern concourse. Check-in desks and security screening occupied a compact central hall, fronted by an outdoor surface parking lot with bus connections. By 2024, the linear concourse had been demolished and replaced by two expansive Y-shaped wings—Concourse A and Concourse B—more than doubling the boarding capacity to eighteen gates equipped with automated walkways.\n\nSignificant improvements were also made to passenger amenities and ground transportation. The central departures concourse was expanded to incorporate a large duty-free retail and dining plaza. On the landside, the former outdoor parking lot was converted into a multi-storey parking structure, while a new subterranean high-speed metro station was excavated beneath the terminal, offering direct passenger rail transfers to the city center.',
  },

  // Task 2 Templates
  {
    key: 'task2_ai',
    name: 'AI & Human Creativity (Agree/Disagree Opinion)',
    badge: 'Task 2 Opinion',
    preset: 'IELTS_TASK_2',
    taskType: 'TASK_2_ESSAY',
    promptStem: 'IELTS Academic Writing Task 2: With the rapid proliferation of artificial intelligence and autonomous cognitive systems, human labour in creative, analytical, and professional fields is facing unprecedented disruption. To what extent do you agree or disagree that automated systems will diminish genuine human creativity and intellectual innovation? Support your argument with concrete illustrations. (Write at least 250 words).',
    minWords: 250,
    maxWords: 400,
    timeLimit: 40,
    sampleAnswer: 'The exponential rise of generative artificial intelligence has sparked intense scrutiny regarding the sanctity of human intellectual and artistic innovation. While techno-pessimists contend that algorithmic automation will inevitably erode human imaginative faculties and induce intellectual complacency, I fundamentally disagree. Rather than diminishing creativity, automated systems serve as powerful cognitive amplifiers that emancipate thinkers from mechanical drudgery and cultivate unprecedented paradigms of creative expression.\n\nFirst and foremost, historical precedents demonstrate that technological revolutions consistently transform, rather than extinguish, human creative potential. When photography emerged in the nineteenth century, conventional portrait artists feared the obsolescence of painting; instead, the medium catalyzed Impressionism, Cubism, and modern abstraction by liberating painters from mere mimetic representation. Analogously, modern generative models provide composers, authors, and designers with expansive computational scaffolds. An architect leveraging parametric algorithms can iteratively explore hundreds of structural permutations within minutes, allowing human discernment to focus on aesthetic nuance, environmental harmony, and social utility.\n\nFurthermore, genuine creativity necessitates emotional resonance, moral intentionality, and lived existential experience—attributes entirely inaccessible to statistical language models. Machine learning algorithms function by recombining historical corpora based on probabilistic token correlation. They lack subjective introspection, existential vulnerability, and the capacity for deliberate defiance of established conventions. Groundbreaking literature, avant-garde cinema, and revolutionary scientific theories invariably emerge from deep socio-cultural friction and human emotional struggle. AI may synthesize plausible syntactical structures, but only human consciousness can infuse meaning, cultural poignancy, and ethical conviction into creative works.\n\nIn conclusion, rather than diminishing human creativity, artificial intelligence expands our imaginative horizons by assuming repetitive technical burdens. Provided educational systems cultivate critical interrogation and philosophical discernment, cognitive automation will elevate human innovation to higher levels of conceptual synthesis.',
  },
  {
    key: 'task2_education',
    name: 'University: Vocational vs Academic (Discussion)',
    badge: 'Task 2 Discussion',
    preset: 'IELTS_TASK_2',
    taskType: 'TASK_2_ESSAY',
    promptStem: 'IELTS Academic Writing Task 2: Some educational theorists argue that tertiary institutions should focus exclusively on providing specialized technical and vocational training for immediate industry employment, while others believe universities should cultivate broad philosophical enquiry and critical thinking regardless of market utility. Discuss both views and give your own reasoned opinion with academic examples. (Write at least 250 words).',
    minWords: 250,
    maxWords: 400,
    timeLimit: 40,
    sampleAnswer: 'A contentious debate in contemporary higher education revolves around whether universities should function predominantly as vocational training grounds tailored to market demands or remain bastions of open intellectual enquiry and critical thinking. While vocational specialization guarantees immediate graduate employ-ability in volatile economic landscapes, I firmly believe universities must balance technical competency with rigorous philosophical and critical cultivation to foster resilient, adaptable citizens.\n\nOn the one hand, proponents of vocational focus emphasize direct return on educational investment and industry alignment. With escalating tuition costs and accelerating workplace automation, students increasingly seek tertiary curricula that equip them with high-demand, actionable skills such as software engineering, data analytics, and biomedical laboratory procedures. In rapidly developing economies, technical polytechnics supply industries with skilled personnel, minimizing corporate on-boarding expenses and driving measurable national productivity. From this pragmatic viewpoint, theoretical abstraction that bears no commercial applicability represents a luxury that modern students can ill afford.\n\nOn the other hand, reducing university education strictly to job-specific training neglects the reality of rapid technological obsolescence. Skills taught for a specific software stack or administrative protocol today may become completely redundant within a decade. Conversely, disciplines rooted in philosophical analysis, comparative literature, and pure scientific research instill foundational competencies: epistemological humility, logical argumentation, ethical reasoning, and cognitive flexibility. A biomedical researcher trained exclusively in narrow techniques may fail to foresee the bioethical dilemmas posed by gene editing; a software engineer devoid of ethics may architect algorithms that exacerbate social inequality. Broad intellectual enquiry empowers professionals to navigate novel moral and structural predicaments throughout lifelong careers.\n\nIn conclusion, while practical vocational proficiency is essential for immediate workforce integration, the true mission of tertiary institutions lies in cultivating holistic analytical intellect. Universities should champion hybrid curricula that integrate technical mastery with rigorous philosophical and humanist enquiry.',
  },
  {
    key: 'task2_space',
    name: 'Space Exploration vs Poverty Relief (Discursive)',
    badge: 'Task 2 Priority Spending',
    preset: 'IELTS_TASK_2',
    taskType: 'TASK_2_ESSAY',
    promptStem: 'IELTS Academic Writing Task 2: Billions of dollars are expended annually on outer space exploration and interplanetary missions, while millions of citizens worldwide suffer from severe poverty, inadequate healthcare, and climate change devastation. Some people argue that governments should redirect space funding toward resolving pressing terrestrial crises. To what extent do you agree or disagree with this view? (Write at least 250 words).',
    minWords: 250,
    maxWords: 400,
    timeLimit: 40,
    sampleAnswer: 'In an era marked by profound social inequality, escalating climate instability, and overburdened healthcare systems, allocating billions of dollars to extraterrestrial exploration frequently evokes intense moral reproach. Many critics maintain that humanitarian crises on Earth demand total fiscal prioritization over speculative interplanetary voyages. While addressing human suffering is undeniably an ethical imperative, I disagree that defunding space exploration is the remedy, as astronomical research provides the technological, ecological, and economic tools essential for solving terrestrial problems.\n\nFirst, the perceived dichotomy between space spending and domestic poverty alleviation relies on a fundamental misconception regarding how space budgets are utilized. Governments do not literally send piles of cash into orbit; rather, capital is invested terrestrially in scientists, engineers, manufacturing supply chains, and academic research institutions. The aerospace sector drives high-wage employment, scientific infrastructure, and tax revenues that directly finance social welfare programs. Furthermore, global space budgets represent a minuscule fraction of national expenditures compared to military defense and corporate subsidies, making it illogical to blame space initiatives for socioeconomic neglect.\n\nMore importantly, space exploration yields indispensable technological spin-offs that directly mitigate acute planetary and human suffering. Modern satellite constellations provide the real-time meteorological and orbital imagery required to model climate change, track agricultural drought patterns, optimize freshwater distribution, and orchestrate humanitarian disaster relief during catastrophic typhoons. Medical innovations originally developed for astronaut survival—such as advanced dialysis filtration, portable cardiac monitors, and robotic micro-surgical tools—have transformed public healthcare worldwide. Defunding space programs would cripple our ability to safeguard global food security and monitor environmental collapse.\n\nIn conclusion, astronomical exploration is not an extravagant vanity project, but an indispensable catalyst for scientific progress and planetary stewardship. Rather than curtailing space exploration, governments should reallocate wasteful military spending toward poverty alleviation while sustaining the orbital innovations that protect humanity\'s collective future.',
  },
  {
    key: 'task2_urban',
    name: 'Urbanization, Traffic & Pollution (Problem & Solution)',
    badge: 'Task 2 Problem/Solution',
    preset: 'IELTS_TASK_2',
    taskType: 'TASK_2_ESSAY',
    promptStem: 'IELTS Academic Writing Task 2: In many contemporary metropolitan cities, rapid urbanization has resulted in catastrophic traffic congestion, prolonged commute times, and dangerous levels of atmospheric air pollution. What are the principal root causes of this urban crisis, and what effective municipal measures can governments implement to tackle these issues? (Write at least 250 words).',
    minWords: 250,
    maxWords: 400,
    timeLimit: 40,
    sampleAnswer: 'The uncontrolled expansion of contemporary metropolises has engendered severe transportation bottlenecks and hazardous particulate air pollution, severely degrading urban inhabitants\' quality of life. This escalating crisis stems primarily from myopic city planning and inadequate mass transit infrastructure. To rectify this deteriorating situation, municipal authorities must execute bold structural reforms encompassing integrated public transit expansion and stringent economic disincentives for private vehicle usage.\n\nThe primary driver of urban gridlock is monocentric urban zoning coupled with historical under-investment in comprehensive public transportation. In most mega-cities, commercial, governmental, and financial activities remain heavily concentrated within historic central business districts, while astronomical housing prices compel the workforce into far-flung suburban peripheries. Because peripheral commuter rail, tramways, and bus networks are frequently fragmented, overcrowded, or unreliable, residents become dependent on private motorized vehicles. This daily mass migration of millions of single-occupancy automobiles inevitably overwhelms road capacity, generating chronic gridlock and spewing nitrogen oxides and fine particulate matter into the urban atmosphere.\n\nTo overcome these systemic challenges, municipal administrations must deploy a cohesive two-pronged strategy: expanding green mass transit and implementing congestion pricing. First, governments should channel capital into dense, electrified subway networks, bus rapid transit (BRT) corridors, and protected cycling thoroughfares. Cities such as Tokyo and Singapore demonstrate that when public transit is clean, punctual, and hyper-connected, citizens naturally abandon private vehicles. Second, city councils must impose decisive economic levers, including variable congestion charges in central zones, exorbitant parking fees, and emissions-based vehicle registration taxes. Revenue generated from these levies can subsequently cross-subsidize public transit fares, ensuring equitable mobility for lower-income commuters.\n\nIn conclusion, urban congestion and atmospheric pollution are the inevitable outcomes of centralized urban planning and car-centric transport policy. By investing decisively in clean mass transit and disincentivizing private motor vehicle use through fiscal mechanisms, cities can restore environmental health and commuter well-being.',
  },
];

export const WritingAuthoringPanel: React.FC<WritingAuthoringPanelProps> = ({
  initialConfig,
  onChange,
  forcedTask,
}) => {
  const isTask1 = forcedTask ? forcedTask === 'TASK_1' : (initialConfig?.preset?.startsWith('IELTS_TASK_1') || false);
  const [promptStem, setPromptStem] = useState(initialConfig?.promptStem || '');
  const [promptImageUrl, setPromptImageUrl] = useState(initialConfig?.promptImageUrl || '');
  const [stimulusText, setStimulusText] = useState(initialConfig?.stimulusText || '');
  const [aiVisualContext, setAiVisualContext] = useState(initialConfig?.aiVisualContext || '');
  const [minWords, setMinWords] = useState(initialConfig?.minWords || (isTask1 ? 150 : 250));
  const [maxWords, setMaxWords] = useState(initialConfig?.maxWords || (isTask1 ? 250 : 400));
  const [timeLimit, setTimeLimit] = useState(initialConfig?.recommendedTimeMinutes || (isTask1 ? 20 : 40));
  const [sampleAnswer, setSampleAnswer] = useState(initialConfig?.sampleAnswer || '');
  const [preset, setPreset] = useState<'IELTS_TASK_1' | 'IELTS_TASK_1_GT' | 'IELTS_TASK_2' | 'TOEFL_INDEPENDENT' | 'CUSTOM'>(
    forcedTask === 'TASK_1'
      ? (initialConfig?.preset === 'IELTS_TASK_1_GT' ? 'IELTS_TASK_1_GT' : 'IELTS_TASK_1')
      : forcedTask === 'TASK_2'
      ? 'IELTS_TASK_2'
      : (isTask1 ? (initialConfig?.preset === 'IELTS_TASK_1_GT' ? 'IELTS_TASK_1_GT' : 'IELTS_TASK_1') : 'IELTS_TASK_2')
  );
  const [taskType, setTaskType] = useState<string>(
    initialConfig?.taskType || (isTask1 ? 'TASK_1_GRAPH' : 'TASK_2_ESSAY')
  );
  const [showSampleAnswer, setShowSampleAnswer] = useState<boolean>(false);

  // Compute clean initial rubrics ensuring Task 1 never has Task 2 criteria, and Task 2 never has Task 1 criteria
  const initialRubrics = (() => {
    if (initialConfig?.rubricCriteria && initialConfig.rubricCriteria.length > 0) {
      if (isTask1) {
        if (initialConfig.rubricCriteria.some((r) => r.id === 'task_response')) {
          return initialConfig.preset === 'IELTS_TASK_1_GT' ? DEFAULT_RUBRICS.IELTS_TASK_1_GT : DEFAULT_RUBRICS.IELTS_TASK_1;
        }
        return initialConfig.rubricCriteria;
      } else {
        if (initialConfig.rubricCriteria.some((r) => r.id === 'task_achievement')) {
          return DEFAULT_RUBRICS.IELTS_TASK_2;
        }
        return initialConfig.rubricCriteria;
      }
    }
    return isTask1
      ? (initialConfig?.preset === 'IELTS_TASK_1_GT' ? DEFAULT_RUBRICS.IELTS_TASK_1_GT : DEFAULT_RUBRICS.IELTS_TASK_1)
      : DEFAULT_RUBRICS.IELTS_TASK_2;
  })();

  const [rubrics, setRubrics] = useState<WritingRubricCriterionDTO[]>(initialRubrics);

  // Synchronize when forcedTask or isTask1 prop changes
  useEffect(() => {
    if (isTask1) {
      if (preset === 'IELTS_TASK_2' || (preset as string) === 'TOEFL_INDEPENDENT') {
        setPreset('IELTS_TASK_1');
      }
      if (rubrics.some((r) => r.id === 'task_response')) {
        setRubrics(DEFAULT_RUBRICS.IELTS_TASK_1);
      }
      if (taskType === 'TASK_2_ESSAY') {
        setTaskType('TASK_1_GRAPH');
      }
    } else {
      if (preset.startsWith('IELTS_TASK_1')) {
        setPreset('IELTS_TASK_2');
      }
      if (rubrics.some((r) => r.id === 'task_achievement')) {
        setRubrics(DEFAULT_RUBRICS.IELTS_TASK_2);
      }
      if (taskType.startsWith('TASK_1')) {
        setTaskType('TASK_2_ESSAY');
      }
    }
  }, [isTask1, forcedTask]);

  useEffect(() => {
    onChange({
      promptStem,
      promptImageUrl: isTask1 ? (promptImageUrl.trim() || undefined) : undefined,
      stimulusText: stimulusText.trim() || undefined,
      aiVisualContext: isTask1 ? (aiVisualContext.trim() || undefined) : undefined,
      chartFacts: isTask1 && aiVisualContext.trim() ? {
        chartTitle: promptStem.slice(0, 100) || 'Visual Stimulus Chart',
        chartType: taskType || 'CHART',
        notes: aiVisualContext.trim(),
        contextText: aiVisualContext.trim(),
      } : (initialConfig?.chartFacts || undefined),
      minWords,
      maxWords,
      recommendedTimeMinutes: timeLimit,
      rubricCriteria: rubrics,
      sampleAnswer: sampleAnswer.trim() || undefined,
      preset: isTask1 ? (preset === 'IELTS_TASK_1_GT' ? 'IELTS_TASK_1_GT' : 'IELTS_TASK_1') : 'IELTS_TASK_2',
      taskType: isTask1 ? (taskType.startsWith('TASK_1') ? taskType : 'TASK_1_GRAPH') : 'TASK_2_ESSAY',
    });
  }, [promptStem, promptImageUrl, stimulusText, aiVisualContext, minWords, maxWords, timeLimit, rubrics, sampleAnswer, preset, taskType, isTask1]);

  const applyTemplate = (t: PresetTemplate) => {
    setPromptStem(t.promptStem);
    setPromptImageUrl(t.promptImageUrl || '');
    setStimulusText(t.stimulusText || '');
    setMinWords(t.minWords);
    setMaxWords(t.maxWords);
    setTimeLimit(t.timeLimit);
    setSampleAnswer(t.sampleAnswer);
    setPreset(t.preset);
    setTaskType(t.taskType);
    if (DEFAULT_RUBRICS[t.preset]) {
      setRubrics(DEFAULT_RUBRICS[t.preset]);
    }
  };

  const loadPreset = (presetKey: string) => {
    // Guard against loading wrong task preset
    if (isTask1 && presetKey === 'IELTS_TASK_2') return;
    if (!isTask1 && presetKey.startsWith('IELTS_TASK_1')) return;

    if (DEFAULT_RUBRICS[presetKey]) {
      setRubrics(DEFAULT_RUBRICS[presetKey]);
      setPreset(presetKey as any);
      if (presetKey === 'IELTS_TASK_1') {
        setMinWords(150);
        setMaxWords(250);
        setTimeLimit(20);
        setTaskType('TASK_1_GRAPH');
      } else if (presetKey === 'IELTS_TASK_1_GT') {
        setMinWords(150);
        setMaxWords(250);
        setTimeLimit(20);
        setTaskType('TASK_1_GENERAL');
      } else if (presetKey === 'IELTS_TASK_2') {
        setMinWords(250);
        setMaxWords(400);
        setTimeLimit(40);
        setTaskType('TASK_2_ESSAY');
      }
    }
  };

  return (
    <div
      data-testid="writing-authoring-panel"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isTask1 ? '📊 IELTS Writing Task 1 Specification' : '📝 IELTS Writing Task 2 Specification'}
        </h4>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: isTask1 ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            color: isTask1 ? '#06b6d4' : '#818cf8',
            border: `1px solid ${isTask1 ? '#06b6d4' : '#818cf8'}`,
            fontWeight: 600,
          }}
        >
          {isTask1 ? 'Task 1 (Visual Stimulus)' : 'Task 2 (Discursive Essay)'}
        </span>
      </div>

      {/* Quick Template Picker */}
      <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          ⚡ 1-Click Writing Templates &amp; Benchmarks ({isTask1 ? 'Task 1 Visual' : 'Task 2 Essay'}):
        </div>

        {isTask1 ? (
          <div>
            <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600, marginBottom: '4px' }}>
              IELTS Academic Task 1 Templates (Visual Data / Process / Maps):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TEMPLATES.filter((t) => t.preset === 'IELTS_TASK_1').map((tmpl) => (
                <button
                  key={tmpl.key}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: promptImageUrl === tmpl.promptImageUrl ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.1)',
                    border: `1px solid ${promptImageUrl === tmpl.promptImageUrl ? '#06b6d4' : 'rgba(6, 182, 212, 0.3)'}`,
                    color: '#06b6d4',
                    cursor: 'pointer',
                    fontWeight: promptImageUrl === tmpl.promptImageUrl ? 700 : 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, marginBottom: '4px' }}>
              IELTS Academic Task 2 Templates (Discursive Essays):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TEMPLATES.filter((t) => t.preset === 'IELTS_TASK_2').map((tmpl) => (
                <button
                  key={tmpl.key}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: promptStem === tmpl.promptStem ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.1)',
                    border: `1px solid ${promptStem === tmpl.promptStem ? '#818cf8' : 'rgba(99, 102, 241, 0.3)'}`,
                    color: '#818cf8',
                    cursor: 'pointer',
                    fontWeight: promptStem === tmpl.promptStem ? 700 : 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prompt Stem */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {isTask1 ? 'Task 1 Prompt Instructions *' : 'Essay Topic / Question Prompt *'}
        </label>
        <textarea
          rows={3}
          value={promptStem}
          onChange={(e) => setPromptStem(e.target.value)}
          placeholder={isTask1
            ? 'e.g. The bar chart illustrates the proportions of renewable electricity generation across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
            : 'e.g. Some people argue that technological development leads to loss of traditional culture. To what extent do you agree or disagree?'}
          style={{
            width: '100%',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text-main)',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Background / Stimulus Text (Optional) */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Background Context / Candidate Stimulus Text (Optional)
        </label>
        <textarea
          rows={2}
          value={stimulusText}
          onChange={(e) => setStimulusText(e.target.value)}
          placeholder="Provide optional candidate instructions or additional background notes..."
          style={{
            width: '100%',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text-main)',
            fontSize: '13px',
          }}
        />
      </div>

      {/* IELTS Task 1 ONLY: Required Stimulus Picture / Chart Attachment */}
      {isTask1 && (
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊</span> Stimulus Image / Chart URL <span style={{ color: '#ef4444' }}>* (Required for Task 1)</span>
            </label>
            {promptImageUrl && (
              <button
                type="button"
                onClick={() => setPromptImageUrl('')}
                style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                ✕ Clear Image
              </button>
            )}
          </div>

          <input
            type="text"
            value={promptImageUrl}
            onChange={(e) => setPromptImageUrl(e.target.value)}
            placeholder="e.g. /assets/charts/ielts_task1_renewable_energy.svg or https://example.com/chart.png"
            style={{
              width: '100%',
              background: 'var(--bg-main)',
              border: !promptImageUrl.trim() ? '1px solid #ef4444' : '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: 'var(--text-main)',
              fontSize: '12px',
              marginBottom: '6px',
            }}
          />

          {!promptImageUrl.trim() && (
            <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '8px' }}>
              ⚠️ A stimulus picture or chart is required for IELTS Writing Task 1. Please provide an image URL or choose a preset asset below.
            </div>
          )}

          {/* Quick Chart Asset Pickers */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Visual Assets:</span>
            {[
              { label: '⚡ Renewable Energy (Bar)', url: '/assets/charts/ielts_task1_renewable_energy.svg' },
              { label: '💧 Desalination (Process)', url: '/assets/charts/ielts_task1_desalination_process.svg' },
              { label: '🌍 CO₂ Trends (Line)', url: '/assets/charts/ielts_task1_global_co2_trends.svg' },
              { label: '🥧 Spending (Pie)', url: '/assets/charts/ielts_task1_household_expenditure_pie.svg' },
              { label: '👥 Population (Pyramid)', url: '/assets/charts/ielts_task1_population_pyramid.svg' },
              { label: '✈️ Airport (Map)', url: '/assets/charts/ielts_task1_airport_redevelopment.svg' },
              { label: '📋 Student Enrolments (Table)', url: '/assets/charts/ielts_task1_student_enrolments_table.svg' },
            ].map((asset) => (
              <button
                key={asset.url}
                type="button"
                onClick={() => setPromptImageUrl(asset.url)}
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: promptImageUrl === asset.url ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${promptImageUrl === asset.url ? '#06b6d4' : 'var(--border-color)'}`,
                  color: promptImageUrl === asset.url ? '#06b6d4' : 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {asset.label}
              </button>
            ))}
          </div>

          {/* Image Preview */}
          {promptImageUrl && (
            <div style={{ marginTop: '8px', textAlign: 'center', background: '#0a0f1d', padding: '10px', borderRadius: '6px', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                <span>Stimulus Preview:</span>
                <span style={{ color: '#06b6d4' }}>{promptImageUrl}</span>
              </div>
              <img
                src={promptImageUrl}
                alt="Stimulus Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('ielts_task1_renewable_energy.svg')) {
                    target.src = '/assets/charts/ielts_task1_renewable_energy.svg';
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* IELTS Task 1 ONLY: AI Visual Context Box (Hidden from candidates, used for AI evaluation) */}
      {isTask1 && (
        <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px' }}>🧠</span>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#06b6d4' }}>
              Picture Context &amp; Key Data (For AI Evaluation Only — Hidden from Candidates)
            </label>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
            Describe the picture, chart data, or process stages below. <strong>Candidates will NOT see this context during the exam.</strong> The AI evaluation engine uses this data directly to verify candidate factual accuracy, data figures, and trend descriptions without needing image OCR or visual analysis.
          </div>
          <textarea
            rows={4}
            value={aiVisualContext}
            onChange={(e) => setAiVisualContext(e.target.value)}
            placeholder={`e.g.
- Chart type: Bar chart comparing renewable electricity generation (2010 vs 2024)
- Surveyed nations: Germany, UK, France, Spain, Norway
- Key figures: Norway hydro dominant at 90% in 2010 and 88% in 2024. Germany wind jumped from 9% to 32%, solar from 3% to 18%. Spain solar+wind expanded from 20% to 45%. UK offshore wind rose from 5% to 28%.
- Main trend: All 5 nations expanded solar and wind capacity while Norway remained reliant on hydro.`}
            style={{
              width: '100%',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'var(--text-main)',
              fontSize: '12px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Limits & Timing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Min Words</label>
          <input
            type="number"
            value={minWords}
            onChange={(e) => setMinWords(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-main)', fontSize: '12px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Max Words</label>
          <input
            type="number"
            value={maxWords}
            onChange={(e) => setMaxWords(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-main)', fontSize: '12px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Time (Minutes)</label>
          <input
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-main)', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Model Answer (Band 9) Collapsible Field */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowSampleAnswer(!showSampleAnswer)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            border: 'none',
            color: 'var(--text-main)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>🏆 Model Answer / Band 9 Exemplar {sampleAnswer ? '✓' : '(Optional)'}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{showSampleAnswer ? '▲ Hide' : '▼ Expand'}</span>
        </button>

        {showSampleAnswer && (
          <div style={{ padding: '10px', background: 'var(--bg-main)' }}>
            <textarea
              rows={6}
              value={sampleAnswer}
              onChange={(e) => setSampleAnswer(e.target.value)}
              placeholder="Paste or write the official Band 9 model response for student post-assessment review..."
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '8px',
                color: 'var(--text-main)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            />
          </div>
        )}
      </div>

      {/* Rubric Criteria Selector */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Evaluation Rubric Presets</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {isTask1 ? (
              <>
                <button
                  type="button"
                  onClick={() => loadPreset('IELTS_TASK_1')}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${preset === 'IELTS_TASK_1' ? '#06b6d4' : 'var(--border-color)'}`,
                    background: preset === 'IELTS_TASK_1' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    color: preset === 'IELTS_TASK_1' ? '#06b6d4' : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: preset === 'IELTS_TASK_1' ? 600 : 400,
                  }}
                >
                  IELTS Task 1 Academic (Report)
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('IELTS_TASK_1_GT')}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${preset === 'IELTS_TASK_1_GT' ? '#06b6d4' : 'var(--border-color)'}`,
                    background: preset === 'IELTS_TASK_1_GT' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    color: preset === 'IELTS_TASK_1_GT' ? '#06b6d4' : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: preset === 'IELTS_TASK_1_GT' ? 600 : 400,
                  }}
                >
                  IELTS Task 1 GT (Letter)
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => loadPreset('IELTS_TASK_2')}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${preset === 'IELTS_TASK_2' ? '#818cf8' : 'var(--border-color)'}`,
                  background: preset === 'IELTS_TASK_2' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: preset === 'IELTS_TASK_2' ? '#818cf8' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: preset === 'IELTS_TASK_2' ? 600 : 400,
                }}
              >
                IELTS Task 2 (Discursive Essay)
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rubrics.map((r, idx) => (
            <div
              key={r.id || idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <div>
                <strong>{r.name}</strong> (Weight: {Math.round(r.weight * 100)}%)
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.description}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#3b82f6' }}>Max {r.maxScore} pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
