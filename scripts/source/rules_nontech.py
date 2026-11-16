# Marking rules for questions 1-20 (general questions for any research).
# Format: see js/marker.js. E = essential, B = bonus, NUM = needs a number,
# X = red flag, MIN = minimum words.
RULES = {
1: """
E | Introduces yourself and your thesis | my name is; presenting my; my thesis; MSc
E | States the comparison of general, disease-specific and transfer learning | transfer learning; disease-specific; three approaches; all ICU patients
B | Names the data and methods | MIMIC-IV; Cox; random survival forest; XGBoost
B | Mentions the common held-out group | same held-out group; same test patients
""",
2: """
E | Gives the title | survival prediction; machine learning survival; non-communicable disease; ICU patients with
E | Explains what the parts of the title mean | time to death; outcome; population; family of methods; each part; word by word
B | Mentions the comparison of approaches | general; disease-specific; transfer learning
""",
3: """
E | Gives your motivation | wanted to know; motivated; motivation; curious; interested in
E | Names the gap: most models are trained on all ICU patients | trained on all ICU patients; all ICU patients together; one model for everyone; pooled
B | Grounds it in the NCD burden | three in four deaths; NCDs cause; deaths
B | Links it to practical choices or low- and middle-income settings | low- and middle-income; prediction tools; Kenya
""",
4: """
E | Says it is not known which approach works best | not known whether; it is not known; did not know which; unclear which; no one knew; nobody knew
E | Names the three approaches | general; disease-specific; transfer learning
B | Mentions NCD patients or the held-out comparison | NCD; same held-out; same patients
MIN | 12
""",
5: """
E | States the main objective | main objective; objective was; my objective
E | It is a comparison of predictive performance | compare the predictive performance; to compare; comparison of
B | Names the approaches | transfer learning; disease-specific
B | Mentions constructing the dataset | construct; dataset
B | Mentions developing Cox, random survival forest and XGBoost | Cox; random survival forest; XGBoost
B | Mentions evaluation and discharge home | held-out; discharge home; recommend
""",
6: """
E | Names model developers or researchers | developer; researcher
E | Names clinicians or hospitals | clinician; doctor; hospital; policy maker; health system
B | Says what each group gains | evidence; whether to train; survival estimates; one adapted model; separate models; cost
X | Overclaims that practice will change everywhere | change practice everywhere; revolutionise
""",
7: """
E | Describes reading the literature | read; review; search; literature
E | Names what earlier work did not do | none of them; no identified study; not compared; never tested; single diagnosis; single diagnoses; yes-or-no; only within
B | Names the strands: general, disease-specific, transfer learning | disease-specific; transfer learning; general ICU
B | Cites the closest study | Xu
""",
8: """
E | Describes the search or selection | searched; search; selected; kept peer-reviewed; peer-reviewed; databases
E | Says how recent the sources are | 2021; recent; current; last five years; 85
B | Explains why some older sources were kept | seminal; Cox; 1972; Ishwaran; 2008
""",
9: """
E | Names data protection or the data use agreement | data use agreement; PhysioNet; credential; de-identified; deidentified; training
E | Says patient data and models were kept off public places | kept all patient-level data; local; never on GitHub; not on GitHub; did not share; aggregate
B | Mentions the risk of influencing end-of-life decisions | end-of-life; support, not replace; support not replace; clinical judgement
""",
10: """
E | Names it as your contribution | contribution; contribute; adds to knowledge; we now have evidence
E | A direct, fair comparison of the three approaches | direct, fair comparison; direct comparison; fair comparison
B | Names NCD patients or survival | NCD; survival
B | Mentions the reusable design | reusable; same pipeline; other patient group
""",
11: """
E | Names a specific challenge | change direction; changing direction; survival analysis; supervisor; size; large tables; missing data
E | Explains how it was handled | kept; rebuilt; filtered; cached; DuckDB; relabelled; legacy; moved to
""",
12: """
E | Says what the original proposal did | original proposal; originally; first built; started with
E | The original outcome was in-hospital death, yes or no | in-hospital death; yes-or-no; yes or no; binary
E | Moved to survival analysis | moved to survival; switched to survival; changed to survival; survival analysis with
B | Question, cohort and approaches stayed the same; earlier results kept as legacy | stayed the same; legacy; superseded
""",
13: """
E | Names the single-centre limitation | one hospital; single hospital; single centre; one centre; Boston; generalis
E | Names missing data or retrospective data | missing; retrospective
B | Names the small NCD groups | chronic respiratory; diabetes; small
B | Gives mitigations | mitigation; per NCD group; full cohort reporting; documented; reduce
""",
14: """
E | Says what you would do differently | would start; do differently; from day one; would also plan; would plan
E | Names a concrete change | survival framing; external validation; eICU access; second database
""",
15: """
E | Compares with Xu and colleagues or the transfer learning literature | Xu; transfer learning beat; earlier study
E | States your own ranking or result | my results; ranking; agree; disagree; partly agree; found
B | Compares methods with the literature | Huang; Cox; machine learning no better
""",
16: """
E | Frames the finding as a decision or choice for health systems | decision; decide; choice; choose
E | Talks about cost or resources | cost; saves; investment; money; resources; maintaining extra models
""",
17: """
E | Says direct generalisation is limited | limited; not without validation; different; not directly; would need
E | Says the design or question transfers | design; same comparison; question transfers; run the same
B | Mentions reporting cohort characteristics or local data | cohort characteristics; local data; Kenyan hospital; future work
""",
18: """
E | Gives a recommendation to model developers | model developer; developers; build
E | Gives a recommendation to researchers or hospitals | researchers; report performance; hospitals; validate locally; validating any model
""",
19: """
E | Names external validation | external validation; second database; African ICU data
E | Names a second direction | separate models for each; DeepSurv; deep learning survival; prospective evaluation; prospective
B | Names other transfer learning methods | other transfer learning
""",
20: """
E | States the question | general; disease-specific; transfer learning
E | States the fair design on one held-out group | held-out group; same held-out; one common held-out; same patients; fair
E | States the main finding | finding; answer; found; result
""",
}
