# Marking rules for questions 101-200 (survival prediction questions for this study).
RULES = {
101: """
E | Studies the time until an event such as death | time until; time to an event; time-to-event; how long; time to death
E | Handles censored patients | censor; follow-up ends; follow-up ended; incomplete follow-up
B | Does not throw censored patients away | instead of throwing; not discard; without discarding; still use
X | Censored patients are not simply removed or counted as survivors | censored patients are removed; remove censored patients; censored patients are survivors
""",
102: """
E | A yes-or-no outcome ignores timing | ignores timing; ignores when; when the event happened; day 2; day 300; count the same; regardless of when
E | Survival analysis handles censoring or early end of follow-up | censor; follow-up ended; follow-up ends
B | Gives risk at several time points from one model | 28 days; 90 days; any time point
B | Supervisor recommended it or it fits the question | supervisor; fits the clinical question
""",
103: """
E | Not passed from person to person | not passed; not transmitted; person to person; not infectious; not contagious
E | Names the four groups | cardiovascular; cancer; chronic respiratory; diabetes
B | Follows the WHO | WHO; World Health Organization
""",
104: """
E | WHO tracks these four groups | WHO; World Health Organization
E | They cause most NCD deaths | most NCD deaths; most deaths; 19 million; 10 million
B | Comparable with global statistics | comparable; global statistics
""",
105: """
E | Freely accessible, de-identified database | freely accessible; de-identified; deidentified; publicly available; database
E | From the Beth Israel Deaconess Medical Center in Boston | Beth Israel; Boston
B | Version 3.1 or contents | 3.1; laboratory; diagnoses; measurements
""",
106: """
E | Through PhysioNet | PhysioNet
E | Training, credentialing or data use agreement | training; credential; data use agreement
B | Checksums checked after download | checksum; SHA256
MIN | 10
""",
107: """
E | 65,283 first ICU stays | 65283; 65 thousand; 65,000
E | 30,467 NCD patients by principal diagnosis | 30467; 30 thousand; 30,000; 46.7
B | Breakdown by NCD group | 24848; 4192; 963; 464
B | Sensitivity definition count | 40733
""",
108: """
E | Keeps observations independent so no patient counts twice | independent; counts twice; once; one stay per patient
E | Stops the same patient being in training and test data | training and test; both sets; leak
B | Later stays depend on earlier ones | later stays; earlier ones; natural choice
""",
109: """
E | Children differ from adults | children; paediatric; pediatric; normal ranges
B | NCD groups are mainly adult conditions; age 18 and over | adult conditions; 18
MIN | 10
""",
110: """
E | Nothing to predict from without vital signs | nothing to predict; no data; almost nothing; meaningful
B | Often data errors or very short stays | data error; short stays
MIN | 10
""",
111: """
E | Survival time up to one year | survival time up to one year; number of days to death; days to death; survival_days
E | Censored at 365 days | censored at 365; 365 days; died_1yr
""",
112: """
E | Many deaths happen after discharge | after discharge; after leaving; misses part
E | Captures longer-term effects of critical illness and chronic disease | longer; chronic; long-term
B | Matches MIMIC-IV follow-up from linked death records | death records; follow-up; linked
""",
113: """
E | The exact event time is unknown | do not know; don't know; unknown; exact event time
E | Only known to be event-free up to a time | event-free; alive up to; only that; up to a certain time; known to be alive
B | In your study, censored at 365 days | 365
X | Censored does not mean the patient died or was removed | censored means they died; censored patients died; censored means removed
""",
114: """
E | Right censoring | right censor; right-censor
E | Administrative, at 365 days | administrative; 365; set by the study design
""",
115: """
E | Discharge home alive | discharge home; going home; goes home; home
E | Among patients who survive to discharge | survive to; survivors; alive at discharge
E | Tests whether the ranking holds for another outcome | ranking holds; different kind of outcome; another outcome; test whether
""",
116: """
E | Survival function is the probability of being alive at time t | probability of still being alive; probability of being alive; chance of being alive; alive at time
E | Hazard is the instantaneous risk given survival so far | instantaneous risk; risk right now; given; survived until
""",
117: """
E | Non-parametric estimate of survival that accounts for censoring | non-parametric; estimate of the survival; accounts for censoring; survival curve
E | NCD patients did slightly better than non-NCD | 22.8; 22.7; 27.0; 27 percent; slightly better; better survival
B | Cancer worst, diabetes best | cancer; 46.7; 46.6; diabetes; 13.1
""",
118: """
E | Compares survival curves between groups | compares survival curves; compare curves; between groups; compare survival
E | Each NCD group differed significantly | significant; 0.001; 0.006; differed
B | Direction differed: cancer worse, others better | cancer; direction; worse
""",
119: """
E | Baseline hazard multiplied by a factor from the predictors | baseline hazard; multiplied; factor; multiply
E | Baseline does not need a particular shape | particular shape; any shape; unspecified; semi-parametric; arbitrary
B | Introduced by Cox in 1972 | 1972; Cox
""",
120: """
E | Compares hazards between groups or per unit change | compares hazards; ratio; one-unit; per unit
E | Interprets a value such as 1.5 as higher risk | 1.5; 50 percent; higher risk; higher instantaneous risk; increase
MIN | 10
""",
121: """
E | Random forest adapted to censored data | random forest; censored; adapted
E | Gives each patient a survival curve | survival curve
B | Captures non-linear effects and interactions; Ishwaran 2008 | non-linear; interactions; Ishwaran; 2008
""",
122: """
E | XGBoost has built-in survival objectives | survival objective; objective; built in; built-in
E | Names the accelerated failure time or Cox objective | accelerated failure time; AFT; Cox
B | Says which objective you used | used; chose
""",
123: """
E | Trained on all ICU patients in the training data | trained on all ICU patients; all ICU patients in the training; non-NCD patients and the NCD; everyone in the training
E | Tested on the held-out group of NCD patients | tested on the held-out; then tested
MIN | 10
""",
124: """
E | Trained only on NCD patients | only on NCD patients; NCD patients only; only NCD
E | Tested on the same held-out group | same held-out; held-out; tested
MIN | 10
""",
125: """
E | Starts from the general model | starts from the general model; start from the general model; begins with the general model; first trained on
E | Adjusted using NCD training patients | adjusts it using NCD; adjusted using NCD; adapt it to NCD; fine-tun; further trained on NCD; adjust it
B | Keeps what was learnt from the large population | keep what; large population
""",
126: """
E | A random 20 percent of NCD patients kept aside | 20 percent; 20%; kept aside; held out; random
E | Every model is tested on the same patients | every model; same patients; exactly these
E | That makes the comparison fair | fair
""",
127: """
E | Share of comparable pairs ranked correctly | comparable pairs; pairs of patients; patient pairs; pairs
E | 0.5 is random, 1 is perfect | 0.5; coin toss; chance level
B | Survival version of the AUC | AUC
""",
128: """
E | Separates those who die by a time from those still alive | by a given time; by that time; still alive; separates
E | 28 days, 90 days and one year are standard clinical time points | standard; clinical time points; short-term; medium-term; full horizon
""",
129: """
E | Brier score averaged over the follow-up period | averaged; over the follow-up; integrated; over time
E | Lower is better | lower is better; lower
B | Squared error with censoring weights | squared; censoring; weights
""",
130: """
E | First 24 hours is a common, practical prediction point | common; practical; prediction point; enough data
E | Prevents later information leaking into the model | leak; later information; reflect the outcome; prevents
""",
131: """
E | Mapped both ICD-9 and ICD-10 | ICD-9; ICD-10; both
E | Gives code ranges for the groups | 390; 459; 140; 208; 490; 496; 250; I codes; C codes; J40; J47; E08; E11; E13
""",
132: """
E | Diagnosis with sequence number 1, assigned by coders | sequence number 1; seq_num; sequence number one; coders; billing; first diagnosis
E | Not always the reason for ICU admission, so a limitation | not always; limitation; reason for ICU
B | Addressed by the sensitivity analysis | sensitivity analysis; first three diagnoses
""",
133: """
E | Principal diagnosis is the strictest definition | strictest; strict; main problem
E | First three diagnoses captures important but not first NCDs | first three; important but not first; wider
B | Same ranking under both means the conclusion is robust to the definition | same ranking; does not depend; under both
""",
134: """
E | Codes only define the group, never used as predictors | define; select; never used as predictors; not predictors; never enter
E | The model only uses the first 24 hours | first 24 hours; only uses
B | Clinicians usually know major NCDs at admission | clinician; know at admission; proxy
""",
135: """
E | Date of death from hospital records and linked state death records | state death records; death records; linked; date of death
E | Follow-up limit, one year after the last discharge | one year; follow-up limit; after the last hospital discharge
""",
136: """
E | Not certainly alive; treated as censored | not certainly; censored; not known to have died
E | Some deaths may be missed, affecting all approaches equally | missed; underestimate; equally; all three approaches
""",
137: """
E | Cancer one-year mortality much higher | 46.7; 46.6; much higher; worse; 19.1
E | Reported results separately for each NCD group | separately; each group; per group; per-group
""",
138: """
E | No separate models for these small groups | did not build separate; part of the pooled; pooled; no separate
E | Results reported separately with wide intervals or caution | wide confidence intervals; cautious; caution; wide intervals; separately
B | Gives the sizes | 464; 963
""",
139: """
E | NCD group is dominated by cardiovascular patients | cardiovascular; 24873; 24848; dominated
E | Many are planned cardiac procedures who do well | planned; cardiac; elective; procedures; do well
B | Non-NCD includes sepsis and trauma; cancer did worse | sepsis; trauma; cancer
""",
140: """
E | Schoenfeld residuals | Schoenfeld
E | Tests per predictor and globally, looking for trends over time | each predictor; global; trend; over time
""",
141: """
E | Mild violations mainly affect calibration over time; common in large samples | large samples; calibration; mild; almost always detected
E | Remedies: stratify or add a time interaction | stratif; time interaction; interaction
B | Random survival forest and XGBoost do not rely on the assumption | do not rely; random survival forest; XGBoost
""",
142: """
E | No standard way to continue training a fitted forest | no standard way; continue training; fitted random forest; already fitted
E | Xu and colleagues did the same | Xu
B | Eight models instead of nine | eight models; eight; nine
""",
143: """
E | Continued boosting from the general model | continued boosting; continue boosting; extra trees; added
E | Extra trees trained only on NCD training patients | NCD training patients; NCD patients; only on NCD
B | Number of extra trees tuned by cross-validation | cross-validation; tuned
""",
144: """
E | General model's linear predictor used as an offset | offset; linear predictor
E | Penalised adjustment fitted on NCD patients | penal; adjustment; NCD training patients
B | Restarting an ordinary Cox fit would converge to the disease-specific model | converge; disease-specific model; restarting
""",
145: """
E | Starting from the general model makes performance worse | worse; makes performance worse
E | Than training on the target group alone, because populations differ | target group; disease-specific; differs too much; source population
B | Your design detects it directly | detects; held-out group
""",
146: """
E | General model trained without the held-out group | excludes the held-out; training data; without the held-out
E | Refitted without each validation fold during tuning | refitted; validation fold
B | Test patients untouched until the final evaluation | untouched; final evaluation
""",
147: """
E | That is what a general model is in practice | that is what a general model is; general model is in practice; NCD patients included; includes NCD
E | No model sees the held-out group | no model sees the held-out; never sees the held-out; no model sees
B | Tests whether adding non-NCD patients helps or hurts | helps or hurts
""",
148: """
E | Randomised search with 5-fold cross-validation | randomised search; random search; cross-validation; 5-fold; five-fold
E | Names a hyperparameter | number of trees; minimum number of patients; leaf; predictors tried
B | Chosen by mean C-index | C-index
""",
149: """
E | Names the objective used | accelerated failure time; AFT; Cox objective; Cox-type objective
E | Gives a reason | I chose; chose; reason is; because it
""",
150: """
E | Ties are common because time is in days | days; common; ties
E | Handled with standard approximations such as Efron | Efron; Breslow; approximation; library default
""",
151: """
E | Names Harrell's or Uno's | Harrell; Uno
E | Uno uses censoring weights and suits heavy censoring | censoring weights; heavy censoring; less biased; 75 percent
""",
152: """
E | Predicted versus observed at fixed time points | fixed time; one year; time point
E | Grouped by predicted risk compared with Kaplan-Meier | group; Kaplan-Meier; observed; calibration plot
B | Integrated Brier score as an overall measure | integrated Brier score; Brier
""",
153: """
E | Paired bootstrap on the same test patients | paired bootstrap; paired
E | Difference in C-index or integrated Brier score with its interval | difference in C-index; difference in integrated Brier; interval of the difference
""",
154: """
E | 25 percent died within a year | 25 percent; 25%; 25.0; quarter
B | Earlier time points | 18.2; 13.5; 13.1; 28 days; 90 days
B | In-hospital death and discharge home | 10.8; 58.8; discharged home
B | NCD figures | 22.8; 22.7; 62.9
""",
155: """
E | Names bilirubin, pH or lactate | bilirubin; pH; lactate
E | Ordered only when clinically indicated | clinically indicated; not routinely; ordered when; worried
B | Gives the percentages | 48.7; 36.1; 31.4
""",
156: """
E | Cox cannot fit with missing values | Cox cannot; cannot fit; needs complete data; complete data
E | XGBoost learns a default direction for missing values | default direction; XGBoost learns; learns; routes
B | Indicators give the others similar information | indicator
""",
157: """
E | Yes, death is a competing risk | yes; competing risk
E | Defined among survivors, so death is excluded rather than modelled | survivors; excluded; survived to discharge
B | Competing risks analysis would be an extension | competing risks analysis; extension; more complete
""",
158: """
E | The question only applies to patients alive at discharge | only applies; alive at discharge; survive
E | Makes it a different outcome from death | different from death; another outcome; really tests
MIN | 10
""",
159: """
E | XGBoost had the best AUROC, about 0.91 | 0.91; XGBoost; best
E | Approaches performed almost the same | almost the same; similar; small differences; small
B | Needed a careful paired comparison | paired; confidence intervals; careful
""",
160: """
E | Names the best approach | general; disease-specific; transfer learning
E | Gives the C-index | C-index
NUM | Gives the actual value from your results
B | Says whether the difference was significant | significant; interval; calibration
""",
161: """
E | States the size of the largest difference | difference; largest
NUM | Gives the actual value from your results
E | Judges whether it would change decisions or matter in practice | in practice; clinically; decision; matter; meaningful
""",
162: """
E | Says whether the ranking held | yes; partly; same; different; held
E | Names the first-three-diagnoses definition | first three; 40733; 40784; sensitivity
""",
163: """
E | Talks about discharge home | discharge home
E | Names the best approach | general; disease-specific; transfer learning
E | Says whether this agrees with the survival result | agrees; disagrees; same ranking; different ranking; survival result
""",
164: """
E | Cardiovascular results | within cardiovascular; cardiovascular patients
E | Cancer results | for cancer patients; cancer patients
B | Small groups have wide intervals | wide intervals; no firm conclusion
""",
165: """
E | Names the best method | Cox; random survival forest; XGBoost
E | Compares with the literature | Huang; Wang; literature; agrees; contrasts
""",
166: """
E | Gives your best C-index | C-index
NUM | Gives the actual value
E | Compares with published values, with caution | Wang; 0.79; published; differ; careful
""",
167: """
E | Gives a reason tied to more data or corrections for NCD patients | more data; shared; corrected; correction; adjustment
E | Or notes NCD patients are already a large share of the general data | 47 percent; already; large share; little to correct
""",
168: """
E | Not a problem in itself: censoring is administrative | not a problem; administrative; not dropping out
E | Survival methods are built for censoring; plenty of events | built for; 16,000; 16000; events; plenty
B | Check Uno's C-index alongside Harrell's | Uno
""",
169: """
E | They stay in the cohort with short survival times | stay in the cohort; included; short survival
E | Notes the trade-off or a landmark alternative | trade-off; prediction window; exclude them; landmark; 24-hour mark
""",
170: """
E | Time zero is ICU admission | ICU admission; intime; admission to the ICU
E | Runs to death or 365 days | 365; death
B | Same point where the 24-hour window starts | 24-hour; predictor window; same point
""",
171: """
E | Strictly, a landmark analysis would start the clock at 24 hours | landmark; start the clock at 24; 24 hours
E | Early deaths may inflate performance slightly | early deaths; inflate; slightly
B | Affects all approaches equally, so the comparison stays fair | equally; fair
""",
172: """
E | The model learns survival under the care actually given | care actually received; learns that; limit treatment; limiting care
E | Risk of reinforcing decisions; support, not drive | reinforce; support; not drive; end-of-life
""",
173: """
E | Yes, a low prediction could lead to less care | yes; less aggressive care; self-fulfilling; less care
E | Safeguards such as showing uncertainty or prompting discussion | uncertainty; discussion; monitoring; safeguard; decision support
""",
174: """
E | Not without validation | not without validation; validation; recalibrat
E | Patients, disease mix and resources differ | differ; disease mix; resources; available tests; age
B | Design transfers; transfer learning can adapt the model locally | design; transfer learning; local data; adapt
""",
175: """
E | Electronic records with the same first-24-hour predictors | electronic records; same predictors; first 24 hours
E | One-year follow-up for death, ideally linked to civil registration | follow-up; civil registration; death
B | Ethics approval and data governance first | ethical approval; ethics; governance
""",
176: """
E | Yes, more data versus more relevant data is the trade-off tested | more data; relevant; trade-off
E | A size-matched comparison would separate the effects | same size; size-matched; learning curve; sample the same size
""",
177: """
E | Yes, the groups behave differently | broad; differently; heterogeneous
E | WHO grouping used and separate groups would be too small | WHO; too small; health systems plan
B | Results reported for each group | each group; per group
""",
178: """
E | Two groups are too small for stable models | too small; 464; 963; stable
E | A pooled NCD model is the middle ground | pooled; middle ground
B | With more data, separate models via transfer learning | more data; transfer learning; next step
""",
179: """
E | Keeps the general model's trees, new trees learn corrections | keeps; kept; corrections; new trees
E | Same mechanism as Xu and colleagues | Xu; same mechanism; closest published
B | More advanced forms exist, such as domain adaptation | domain adaptation; advanced
""",
180: """
E | Possibly | possibly; might; could
E | Describes multi-task learning or domain adaptation | multi-task; domain adaptation; reweight; shared
B | More complex and less established, so the simpler method came first | complex; less established; simpler
""",
181: """
E | Names Xu and colleagues | Xu
E | Xu used eICU, a yes-or-no outcome and single diagnoses | eICU; yes-or-no; single diagnoses; yes or no
E | Yours uses MIMIC-IV, NCDs as a group and survival | MIMIC-IV; combined group; survival outcome
B | Adds a random survival forest; Xu is a preprint | random survival forest; preprint
""",
182: """
E | It sets a prior that the general model is hard to beat | hard to beat; prior; general model
E | Their methods targeted worst-case subgroups; transfer learning targets one known group | worst-case; known group; targeted; robust
""",
183: """
E | Calibration should guide the choice | calibration
E | Individual estimates depend on calibration; ranking can be similar | absolute risks; individual; rank patients equally; similar
""",
184: """
E | Yes, mostly in-hospital deaths | largely; mostly; in hospital; before discharge
E | Gives the figures | 13.5; 13.1; 10.8
B | One-year AUC captures deaths after discharge and chronic disease | after discharge; one-year; chronic
""",
185: """
E | Codes are assigned at discharge | assigned at discharge; at discharge; not available at 24 hours
E | Would leak future information and overstate performance | leak; overstate; future information
""",
186: """
E | Probably helpful because comorbidity affects survival | probably; comorbidity; Simpson
E | Discharge codes would leak; must use prior admissions only | leak; previous admissions; prior admissions; prior information
""",
187: """
E | Later stays break independence | independence; independent
E | Over 65,000 first stays, so little is lost | 65,000; 65000; 65283; little; small gain
B | Simple patient-level split | patient-level; split
""",
188: """
E | Both versions present; switch in 2015 | 2015; both; switched
E | Mapped each version separately with equivalent ranges | mapped; equivalent; ranges; separately
""",
189: """
E | 28-day and 90-day AUCs show whether the ranking changes | 28-day and 90-day; time points; whether the ranking changes
E | Refitting at another horizon would be a full check | refitting; refit; another horizon; different horizon; full check
""",
190: """
E | Names a user group | clinician; palliative; families; managers
E | Says what they would use it for | planning care; plan care; talking with families; talk with families; follow-up needs; decide who to see; expected outcomes
""",
191: """
E | Cox assumes linear effects on the log hazard | linear; log hazard
E | Checks such as martingale residuals or splines | martingale; spline; residual
B | Tree methods do not need the assumption | tree; do not need
""",
192: """
E | Indicator hazard ratio reflects the risk of not having the test | not having the test; indicator; less worried
E | Coefficients serve prediction, not causal interpretation | prediction; not causal; careful
""",
193: """
E | No | no; not useless
E | A general model is enough for this population and setting | enough; this population; this setting
B | Disease-specific models may still help in other cases | small, very different groups; cancer stage; still help; different groups
""",
194: """
E | Separate models cost effort to build and maintain | cost; effort; maintain
E | Gain must be clear and large enough to change decisions | change decisions; large enough; statistically clear; calibration
""",
195: """
E | eICU covers many hospitals with more variation | 200; many hospitals; variation; multi
E | Results could change; that is why external validation is suggested | could; might; external validation; cannot know; future work
""",
196: """
E | Coding depth can change over time or with the ICD version | coding; change over time; ICD version
E | Random split spreads periods so the comparison is not biased | random split; spreads; not bias
B | A temporal split would test it | temporal split; by period
""",
197: """
E | Components are already among the predictors | already; components; raw form; repeat
E | A severity score baseline would show the gain over current practice | baseline; comparator; current practice
""",
198: """
E | Choices were made with cross-validation in training data | choices were made; tuning used cross-validation; chosen with cross-validation; selection
E | Judged once on the held-out group | judgement was made once; evaluated once; judged once; used once; separated
""",
199: """
E | Fair, paired comparison on the same patients | fair; paired; same patients
E | Checked across methods, definitions and outcomes | three methods; two NCD definitions; two outcomes; across
B | Other hospitals remain an open question | open question; other hospitals
""",
200: """
E | Testing every model on the same held-out group | same held-out group; same held-out; same test patients; same patients
E | Makes the comparison fair | fair
""",
}
