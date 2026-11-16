# Marking rules for questions 21-100 (general technical questions).
RULES = {
21: """
E | Names Python | Python
E | Names the main libraries | pandas; scikit-learn; scikit-survival; lifelines; xgboost; DuckDB
B | Mentions version control or the write-up tools | git; LaTeX; Word
""",
22: """
E | Learns patterns from examples or data | learn patterns; learns from examples; learning from data; learns from data; patterns from; from examples
E | Not written by hand as rules | instead of writing; by hand; not programmed; without explicit; rules
B | Links to your data | ICU stay; first 24 hours; survival
""",
23: """
E | Supervised learning uses known answers or labels | known answer; answer is known; labels; labelled; known outcome
E | Unsupervised finds structure without answers | without an answer; no answer; structure; cluster; without labels
E | Says your study is supervised | mine is supervised; study is supervised; my study is supervised; supervised
""",
24: """
E | Training set is the data the model learns from | training set is; data the model learns from; model learns from
E | Test set is kept aside and used once on unseen patients | kept aside; never seen; used once at the end; has never seen
B | Names the held-out group of NCD patients | held-out group of NCD; 20 percent of all NCD
""",
25: """
E | Says 80/20 is a common convention | common; convention; standard; usual
E | Says the test set is large enough for stable estimates | enough; stable; precise; narrow; large enough; 6100; 6,100
B | Most data left for training | most of the data; for training
""",
26: """
E | Defines overfitting as learning noise and doing worse on new data | noise; worse on new; new data; memoris; too closely
E | Names a safeguard such as cross-validation or a test set used once | cross-validation; used once; test set; limits; depth; leaf
""",
27: """
E | Defines underfitting as too simple to capture the pattern | too simple; poorly even on the training; even on the training data; fails to capture; cannot capture
B | Gives an example such as a linear Cox model | linear Cox; non-linear
MIN | 10
""",
28: """
E | Defines a predictor as an input variable | input variable; input; variable the model uses; feature
E | Gives the number 69 | 69; sixty-nine
B | Names the first 24 hours and examples | first 24 hours; vital signs; laboratory; Glasgow Coma Scale; urine output
""",
29: """
E | Set before training, not learned | before training; not learned; chosen before; set by hand
E | Gives an example from your models | number of trees; learning rate; tree depth; leaf size; boosting rounds; minimum leaf
MIN | 10
""",
30: """
E | Splits training data into parts | five parts; k parts; split the training data; folds; parts
E | Trains on some parts and checks on the rest, rotating | rotates; each part; trained on four; checked on the fifth; in turn; average
B | Used to choose hyperparameters without touching the test set | hyperparameters; test set is never touched; without the test set
""",
31: """
E | Selected the cohort or built outcomes | adult first ICU stay; selected; cohort; outcomes; NCD groups
E | Describes cleaning or summarising predictors | implausible; removed; recording errors; minimum, maximum and mean; summarised; six-hour look-back; first 24 hours
B | Mentions the MIMIC Code Repository or unit conversion | MIMIC Code Repository; Fahrenheit; Celsius
""",
32: """
E | Median imputation for Cox and the random survival forest | median imputation; median
E | Missing indicators | missing indicator; indicator; flag
E | XGBoost handles missing values itself | XGBoost handles; XGBoost learns; branch; built-in; natively
B | Medians from training data only | training data only; from training data
""",
33: """
E | Defines scaling as putting variables on a similar range | similar range; standardis; same scale; normalis; range
E | Tree models do not need it | tree; do not need; split on thresholds
B | Cox model or penalty benefits | Cox; penalised; coefficients
""",
34: """
E | Fixes random processes so results repeat | gives the same results; same results; starting point; reproducible
E | Names the random processes | random process; randomness; data split; bootstrap samples; tree building
B | Names the seed 42 | 42
MIN | 10
""",
35: """
E | Names the computer used | personal; Windows; computer; laptop; hardware
E | Names the slowest step or model | slowest; random survival forest took longest; chartevents; labevents; longest; extracting
""",
36: """
E | Uses git or version control | git; version control; commit
E | Keeps patient data and models out of the repository | gitignore; excluded; not in the repository; data use agreement; never committed; aggregate
""",
37: """
E | Says yes, with PhysioNet access | PhysioNet; credentialed; access
E | Names reproducibility aids | checksum; SHA256; fixed random seed; fixed seed; README; fixed order; versions
""",
38: """
E | Defines a baseline as a simple reference to beat | simple reference; reference model; should beat; benchmark
E | Names the Cox model or the general approach as baseline | natural baseline; Cox general model; Cox model; general approach also
""",
39: """
E | Defines leakage as information not available at prediction time | not be available; not available; prediction time; future information; look better
E | Gives at least one safeguard | first 24 hours; diagnosis codes; one stay per patient; training data only; tuning only
B | Several safeguards named | never using diagnosis; imputation medians; same patient
""",
40: """
E | Defines class imbalance as one outcome much rarer | rarer; rare; one outcome; unequal
E | Says it was moderate or gives the death rate | moderate; 25 percent; 22.8; 22.7; one in four; 25%
B | Mentions stratified splitting or censoring information | stratif; censored
""",
41: """
E | Splits patients step by step on questions or thresholds | step by step; threshold; splits patients; questions such as
E | Ends in groups with similar outcomes | similar outcomes; leaf; leaves; branches
B | Building block of random forests and boosting | building block; unstable
MIN | 10
""",
42: """
E | Many trees | many decision trees; many trees; ensemble
E | Bootstrap samples or random predictors, averaged | bootstrap; random subset; averag
B | Survival version | random survival forest; censored
MIN | 12
""",
43: """
E | Trees built in sequence, each correcting the last | one after another; sequence; correcting; errors; previous trees
E | XGBoost is an efficient implementation | XGBoost; efficient; implementation
B | Mentions regularisation, missing values or survival objectives | regularis; missing values; survival objective
""",
44: """
E | Models the probability of a yes-or-no outcome | probability; yes-or-no; binary; yes or no
E | Says it was the linear baseline in the legacy in-hospital analysis | legacy; earlier; in-hospital; baseline
""",
45: """
E | Accuracy is correct predictions at one threshold | one threshold; threshold; share of correct; correct predictions
E | AUC measures ranking across all thresholds | ranking; ranks; all thresholds
B | Links to the C-index | C-index; time-dependent
""",
46: """
E | Cox is the standard, interpretable survival model | standard statistical model; standard method; interpretable; Cox is the standard
E | The machine learning methods are established or often best | well-established machine learning; most often performs best; main families
B | Checks whether the ranking depends on the method | depends on the method; ranking of the three approaches
""",
47: """
E | Tabular data, where tree-based methods do as well | tabular; tree-based methods; as well as deep learning
E | Harder to do transfer learning or interpretation fairly | harder to do fairly; transfer learning and interpretation harder; harder
B | Names DeepSurv as future work | DeepSurv
""",
48: """
E | Randomised or grid search | randomised search; random search; grid search; search
E | Five-fold cross-validation on training data | cross-validation; 5-fold; five-fold; training data only
B | Refitted the general model without each fold for transfer learning | refitted; without each validation fold; validation fold
""",
49: """
E | Test set used only once, after everything was fixed | used once; only once; once, after
E | Tuning used cross-validation inside the training data | tuning used cross-validation; did not go back; never went back; inside the training data
""",
50: """
E | Keeps the outcome share the same in both parts | same share; same death rate; same proportion; equal
E | Stratified by one-year death | one-year death; outcome; death
""",
51: """
E | One patient in both sets would let the model recognise the patient | recognise; same patient; both sets; leak; twice
E | Kept only the first ICU stay per patient | first ICU stay; one stay per patient; appears once
""",
52: """
E | Discrimination is ranking | rank; order; discrimination
E | Calibration is predicted probabilities matching what happens | match; probabilities; 30 percent; believable; actually happens
B | Wrong absolute risks would mislead clinicians | mislead; clinicians; absolute risk
""",
53: """
E | Mean squared difference between predicted probability and outcome | squared; difference; error
E | Lower is better | lower is better; lower
B | Integrated over follow-up with censoring weights | integrated; censoring; averag
""",
54: """
E | Bootstrap resampling | bootstrap; resampl
E | Percentile interval from many resamples | percentile; 2.5; 97.5; 1000 resamples
""",
55: """
E | Bootstrap of the difference between approaches | bootstrap; difference
E | Paired comparison on the same test patients | paired; same test patients; same patients
B | Significant if the interval excludes zero | excludes zero; interval; 95 percent
""",
56: """
E | Simple models have high bias | bias; simple
E | Flexible models have high variance | variance; flexible
B | Links to disease-specific versus general approaches | disease-specific; fewer patients; transfer learning; data relevance
""",
57: """
E | Verified the download | checksum; SHA256; verified every downloaded
E | Checked values, missingness or outcomes | implausible; missingness; Kaplan-Meier; compared the cohort
""",
58: """
E | Repeats the analysis under a different assumption | repeat; different assumption; different reasonable; under a different
E | Names your NCD definition change | first three diagnoses; principal diagnosis; top three; 40784; 40,784; 40733
B | Shows the conclusion does not depend on one definition | not depend; holds; one definition
""",
59: """
E | Routinely measured in the first 24 hours | routinely; first 24 hours; available
E | Clinically relevant, used in severity scores or earlier studies | severity scores; earlier; clinical relevance; MIMIC studies; relevant
B | Names the predictor types | vital signs; laboratory; Glasgow Coma Scale; urine output; ventilation
""",
60: """
E | 69 predictors is small relative to patients | small; relative; 69; many patients
E | Same predictor set keeps the comparison fair | same predictor; fair; all approaches
B | Trees handle irrelevant predictors or Cox can be penalised | irrelevant; penalis
""",
61: """
E | Cox is interpretable through hazard ratios | hazard ratio; Cox
E | Random survival forest and XGBoost are less transparent | less transparent; black box; less interpretable
B | Importance or SHAP can explain them | SHAP; variable importance; importance
""",
62: """
E | States whether SHAP was used | SHAP; did not; yes
E | Explains what SHAP shows or why it would help | pushed; how much each predictor; clinical use; natural addition; explain
""",
63: """
E | Penalty for complexity to stop overfitting | penalty; complexity; overfitting
E | Names where it was used | XGBoost; transfer learning; leaf weights; Cox
""",
64: """
E | Testing on data from a different source or hospital | different source; another hospital; different hospital; second database; new hospital
E | Explains why not done | outside the scope; time; access; MSc
B | Comparison still fair because all approaches share the limitation | same limitation; fair; eICU; future work
""",
65: """
E | Internal uses the same source, such as held-out data or cross-validation | same source; held-out; cross-validation; internal
E | External uses another hospital, region or period | another hospital; different hospital; region; time period; external
MIN | 12
""",
66: """
E | Runs at the end of the first 24 hours from the electronic record | 24 hours; electronic record; pull the predictors
E | Supports rather than replaces clinical judgement | support; not replace; judgement
B | Needs local validation or approval | local validation; approval; validated
""",
67: """
E | Cox is cheapest | cheapest; fastest
E | Random survival forest is the most expensive | most expensive; memory; saved models are large; slowest
B | All fast enough to predict at the bedside | fast enough; bedside
""",
68: """
E | Used plausible ranges | plausible range; range; MIMIC Code Repository
E | Removed values outside as recording errors | recording error; removed; outside
B | Kept genuine extremes | extreme; real; kept
""",
69: """
E | Few categorical variables; sex coded 0 or 1 | sex was coded; sex coded; 0 or 1; few categorical; categorical
B | Ventilation, vasopressor and missing indicators are binary | ventilation; vasopressor; indicator
MIN | 10
""",
70: """
E | Says no: this is a prediction study | no; prediction study; prediction
E | Prediction does not equal causation | cause; causal; without causing; does not mean
B | Gives an example such as vasopressor use | vasopressor; marks how sick
""",
71: """
E | Defines bias as worse performance for some groups | worse for some groups; performing worse; worse for some; unfair
E | Says what subgroup check was done | across the four NCD groups; by sex; race or ethnicity; subgroup check; by race
""",
72: """
E | Built in small steps with checks | small steps; check; checks
E | Names specific checks | checksum; counts; appears once; Kaplan-Meier; supervisor; reviewed
""",
73: """
E | Statistically significant can be too small to matter | too small; matter; meaningful; large sample
E | Interprets both statistical and clinical importance | both; clinical; patients
B | Gives an example | 0.005; 6100; 6,100
""",
74: """
E | It only measures ranking | only measures ranking; ranking; rank
E | Names another failure: calibration, subgroups or new data | calibrat; subgroup; new patients; old data
""",
75: """
E | Scripts describe their inputs and outputs, or a README gives the order | each script; inputs and outputs; README
B | The methodology chapter or table headers document the rest | methodology chapter; headers
MIN | 10
""",
76: """
E | Names an internal validity threat | missing data; coding; internal
E | Names an external validity threat | single; one centre; US centre; external
B | Names construct validity and mitigations | construct; principal diagnosis; sensitivity analysis; reporting
""",
77: """
E | Practice and patients change over time so accuracy may fall | change; lose accuracy; drift; over time
E | Needs monitoring or recalibration | monitor; recalibrat; retrain
B | Mentions ICD-9 to ICD-10 or 2008 to 2019 | ICD-9; ICD-10; 2008; 2019
""",
78: """
E | Track discrimination and calibration on new patients | discrimination; calibration; new patients; track
E | Thresholds to recalibrate or retrain | threshold; recalibrat; retrain
B | Watch predictor distributions or NCD groups | distribution; NCD group
""",
79: """
E | Re-identification or memorisation risk | re-identif; reidentif; combined; memoris
E | Followed the data use agreement and kept data local | data use agreement; local; never tried; aggregate
""",
80: """
E | Models can store information about patients | store information; memoris; remember; individual
E | Data use agreement forbids redistribution, so models stay local | data use agreement; redistribut; stay local; local
B | Others can retrain from the code | retrain; code
""",
81: """
E | Sample fixed by the database, no formal calculation | did not; fixed by the database; no formal; fixed
E | Events per predictor well above minimums | events per predictor; 6900; 6,900; adequate; far above; plenty
B | Smallest NCD groups limit precision | smallest; precision; small groups
""",
82: """
E | Few planned comparisons | small number; planned; three approaches; few
E | Focus on intervals and consistency of ranking across methods | confidence interval; consistency; consistent; all three methods; ranking
""",
83: """
E | No single algorithm is best for every problem | no single; best for every; every problem
E | Why several methods were tested or conclusions are limited to this setting | three different methods; several methods; this population; not a universal
MIN | 12
""",
84: """
E | Says whether multiple seeds were checked | seeds; repeated; did not run
E | Refers to bootstrap intervals or stability | bootstrap; intervals; stab; uncertainty
""",
85: """
E | Missingness in the ICU is often informative | informative; not missing at random; when a clinician is worried; ordered when; carries information
E | Missing indicators or XGBoost use that information | missing indicator; indicator; XGBoost
B | Indicators can harm when missingness depends on the outcome | depends on the outcome; Sisk; harm
""",
86: """
E | Multiple imputation is hard to apply at deployment | deployment; new patient; hard to apply
E | Median imputation performs about as well for prediction | non-inferior; noninferior; as well; Berkelmans
B | Simple to reproduce | simple; reproduc
""",
87: """
E | Names TRIPOD | TRIPOD
B | Names TRIPOD+AI or what it covers | AI; data source; participants; checklist
MIN | 8
""",
88: """
E | Yes if used for individual patient care | yes; regulated; medical device
E | Would need validation and approval first | validation; approval; clinical evaluation
""",
89: """
E | Trusting a computer output too much | trust; too much; override; own judgement
E | Risk of giving up on a patient or the need to show uncertainty | give up; too early; uncertainty; one input
""",
90: """
E | Show the survival curve or estimates at time points | survival curve; 28 days; 90 days; one year; estimates
E | Show the main factors driving risk | main factors; lactate; Glasgow Coma Scale; hazard ratio; SHAP
""",
91: """
E | Recalibrate | recalibrat
E | Retrain on newer data | retrain; newer data
B | Transfer learning as a way to update | transfer learning; adapt
""",
92: """
E | Depends on the intended use; performance in the target group matters | depends; target group; NCD patients; use
E | Report both and avoid a model worse for its group | report both; avoid; visible; trade-off
""",
93: """
E | Prediction | prediction
E | No causal claims; hazard ratios are not causal effects | causal; cause; not claim
MIN | 10
""",
94: """
E | Censoring independent of the outcome given predictors | independent censoring; censoring is independent; independent
E | Most censoring is administrative at 365 days | administrative; 365; fits
""",
95: """
E | Not necessarily; a small ranking difference may not change decisions | not necessarily; small difference; decision
E | Look at calibration, the interval or decision curve analysis | calibration; confidence interval; decision curve; net benefit
""",
96: """
E | Estimates net benefit across risk thresholds | net benefit; thresholds
E | Explains why not done | focus; no single agreed decision; did not include; standard performance
""",
97: """
E | One general model adapted to each hospital or group | adapted to each hospital; adapt it to each; each hospital; per hospital; across hospitals
E | Trained on a large pooled dataset or shared without moving data | large pooled dataset; pooled dataset; federated
B | Federated learning where data cannot be shared | federated
""",
98: """
E | Can be acceptable if validated, calibrated and explained | validated; calibrated; explain; SHAP
E | Prefer the transparent model if performance is similar | prefer; simpler; transparent; Cox
""",
99: """
E | Expected transfer learning to perform at least as well | expected; transfer learning
E | A clear win for another approach would contradict it and would be reported | contradict; report; negative result; disease-specific or general
""",
100: """
E | Names the single-database, single-centre limitation | one database; single centre; one centre; single database; one hospital
E | Defends it: fair comparison on the same data | fair; same data; between them
B | Design is documented and repeatable | documented; repeated; repeatable
""",
}
