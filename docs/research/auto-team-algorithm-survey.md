# Auto-team combinatorial optimization survey

Research note mapping the FGO bond-farming auto-team planner onto named combinatorial problems, and scoring algorithm families for this instance. No implementation.

**Problem source (this repo):** `docs/自动配队计算算法需求.md`, `src/assets/data.json` (436 servants, 8 attribute CE types), `src/utils/data.ts` (3 extra class CE types: Caster / Rider / Saber). Catalog snapshot used for scale estimates: 436 real servants; rarity mix 5★=186, 4★=184, 3★=40, 2★=13, 1★=12, 0★=1.

Wikipedia pages are used only as named-algorithm pointers; claims below are followed to the cited originals.

---

## 1. Formal problem (this instance)

### Decision

Assign servants and craft essences (CEs) to \(N \in \{3,4,5,6\}\) distinguishable slots.

- Occupied slot: one servant. Empty slots allowed. CE requires a servant.
- 0 or 1 **support** slot: servant is given (not optimized); cost 0; CE inventory is unlimited (duplicates allowed); optimize CEs only. Support may be crowned.
- **Crown** slots (any subset, including support): servant wears 2 CEs; only one CE’s cost is charged. All relevant CEs cost 16.
- Servant cost by rarity: 5★=16, 4★=12, 3★=7, 2★/0★=4, 1★=3, Mash=0. Team cost \(\le W \in [56,118]\). Support servant+CE cost is 0.
- User may lock servant and/or CE on any slot.

### Objective

Maximize \(\sum_i \mathrm{yield}_i\), where for servant \(i\):

\[
\mathrm{yield}_i = \mathbf{1}[\mathrm{canGain}_i]\cdot\bigl(1 + \mathrm{CEBonus}_i + 0.25\cdot A\bigr)
\]

- \(\mathrm{canGain}_i\): bond not capped. Bond-15 with cap 15: \(\mathrm{canGain}=0\) but they still **emit** aura. Bond-15 with cap 16: \(\mathrm{canGain}=1\) and they emit **and** receive aura (including their own).
- \(A\): number of bond-15 servants on the team (aura emitters).
- \(\mathrm{CEBonus}_i\): sum of matching CEs. Type/class match +20%; generic 10% (1 owned copy); generic 5% (treated as unlimited); generic 15% (support only).

### Compact rewrite of the aura term

Let \(G\) be the number of \(\mathrm{canGain}\) servants on the team. Then

\[
\text{total yield} = G + \sum_i \mathbf{1}[\mathrm{canGain}_i]\,\mathrm{CEBonus}_i + 0.25\cdot A\cdot G.
\]

The only nonlinear coupling among servants is the **rank-1 product** \(A\cdot G\). CE bonuses are linear in (servant, CE) pairs except for inventory / crown-cost sharing. This is the main structural fact used below.

---

## 2. Naive enumeration size

Slots are distinguishable once crown / support / locks are present, so ordered assignments (permutations) are the honest naive count. CE types in this project: 8 attribute + 3 class + generic 10% + generic 5% + support-only 15% \(\approx 13\) kinds. Treating each CE slot as an independent 13-way choice **ignores inventory** and is therefore an **upper bound** on a type-enumeration, not a feasible-set size.

| Quantity | Formula / typical input | Value |
|---|---|---|
| Ordered servant fill, full catalog | \(P(436,6)\) | \(6.64\times 10^{15}\) |
| Unordered servant subset | \(\binom{436}{6}\) | \(9.22\times 10^{12}\) |
| Typical filtered pool | \(P(100,6)\) | \(8.58\times 10^{11}\) |
| Mid filtered pool | \(P(200,6)\) | \(5.93\times 10^{13}\) |
| CE maps, no crown | \(13^{6}\) | \(4.83\times 10^{6}\) |
| CE maps, all crown | \(13^{12}\) | \(2.33\times 10^{13}\) |
| Naive full (catalog, no crown) | \(P(436,6)\cdot 13^{6}\) | \(\approx 3.2\times 10^{22}\) |
| Naive full (catalog, all crown) | \(P(436,6)\cdot 13^{12}\) | \(\approx 1.5\times 10^{29}\) |
| Naive typical (pool 100, no crown) | \(P(100,6)\cdot 13^{6}\) | \(\approx 4.1\times 10^{18}\) |
| Empty slots included | \(\sum_{k=0}^{6} P(436,k)\,13^{k}\) | still \(\approx 3.2\times 10^{22}\) (dominated by \(k=6\)) |

Even after collapsing interchangeable non-crown / non-support / unlocked slots to combinations, \(\binom{436}{6}\cdot 13^{6} \approx 4.4\times 10^{19}\) remains hopeless. Cost pruning (\(W\le 118\)) does **not** change the leading term: six 5★ + CEs already fit under 118 when support/crown/Mash are used, and many 4★/5★ mixes also fit.

**Conclusion:** brute force over servants × CEs is not a candidate. Any exact method must exploit (i) \(N\le 6\), (ii) tiny CE type set, (iii) cheap cost knapsack (\(W\le 118\)), (iv) rank-1 aura.

---

## 3. What named problem this *is* vs *is only like*

This is **not** a single textbook problem. The closest named cores, and why they are incomplete:

| Named problem | Relation |
|---|---|
| **0-1 / multiple-choice knapsack** | Cost + “pick one bundle per slot” is exactly knapsack / MCKP **if** servant uniqueness and aura product are ignored. |
| **Quadratic knapsack (QKP)** | Aura term \(A\cdot G\) is a QKP profit on servant-subset selection. Extra layers: cardinality \(N\), slot types, CE assignment, inventory. |
| **Assignment / bipartite matching** | Linear CE-to-servant matching (and locked slots) **is** an assignment subproblem. The full team problem is not, because of cost + aura. |
| **Generalized assignment (GAP)** | Analogous: agents/items with agent-dependent weights and a budget. Here there is **one** team budget, not per-slot budgets, plus quadratic aura. |
| **Quadratic assignment (QAP)** | Only analogous: pairwise interaction exists, but slots are almost interchangeable (no distance matrix). QAP hardness results do **not** transfer as a lower bound on *this* instance. |
| **Uncapacitated facility location (UFL)** | Only analogous for the aura subproblem: a bond-15 servant is a “facility” that serves every gainer. No opening-cost / client-distance structure. |
| **Set cover** | Only a loose analogy (“cover teammates with bonuses”). Objective is maximize weighted yield, not hit every element. Cover approximation theory does not apply. |
| **0-1 ILP / MILP** | Exact modeling language. The instance (a few thousand binaries, \(N\le 6\)) is small for modern MIP/CP solvers. |

A precise but unnamed composition:

> **Cardinality-constrained quadratic multiple-choice knapsack** with assignment uniqueness, heterogeneous slot types (crown / support / locks), and a second-stage CE matching under inventory.

The quadratic form is **rank-1** (\(A\cdot G\)), so it is far easier than general QKP (which is strongly NP-hard by reduction from Clique [Gallo, Hammer, Simeone 1980; Pisinger 2007; Garey & Johnson 1979]).

---

## 4. Algorithm families

Each family: formal name / analogy, scale, optimality, mapping, win/lose on this instance, sources.

### 4.1 Linear assignment (Hungarian / min-cost bipartite matching)

**Formal name.** Linear assignment problem: given an \(n\times n\) score matrix, find a bijection maximizing the sum of chosen entries [Kuhn 1955]. Polynomial; a special case of min-cost flow / LP [Kuhn 1955; Wikipedia “Assignment problem” as pointer].

**Scale.** Classical Hungarian is \(O(n^3)\); modern implementations handle \(n\) in the thousands easily. Kuhn’s original setting is \(n\) persons × \(n\) jobs [Kuhn 1955].

**Optimality.** Exact for a **linear** objective with assignment constraints only. No cost knapsack, no pairwise terms.

**Mapping.** Useful as a **subroutine**: given a fixed servant set (and remaining cost / inventory), assign CEs to CE-slots to maximize \(\sum \mathrm{CEBonus}_i\). Support CEs are an unconstrained max over types (including 15%). Crown = two CE-slots, one cost. Locked CEs are fixed columns.

**Win / lose.** Wins as a cheap exact inner solver (\(n\le 12\) CE-slots). Loses as a standalone team solver: servant costs and \(A\cdot G\) are not linear assignment costs, and slots are not “jobs” with independent scores until the rest of the team is known.

**Sources.** Kuhn, H. W. (1955). The Hungarian method for the assignment problem. *Naval Research Logistics Quarterly* 2(1–2), 83–97. doi:10.1002/nav.3800020109.

---

### 4.2 Generalized assignment (GAP)

**Formal name.** Assign items to agents; item weight and profit may depend on the agent; each agent has a capacity [Ross & Soland 1975; Fisher, Jaikumar & Van Wassenhove 1986]. NP-hard; APX-hard in general [Wikipedia “Generalized assignment problem” as pointer; Fleischer, Goemans, Mirrokni & Sviridenko 2006]. Special cases: one agent → knapsack; identical weights across agents → multiple knapsack [Kellerer, Pferschy & Pisinger 2004].

**Scale.** Ross–Soland branch-and-bound (1975); Fisher–Jaikumar–Van Wassenhove multiplier adjustment (1986) solved vehicle-routing-derived instances and random GAP with far fewer nodes than prior B&B. Savelsbergh-style MIP / B&B later reaches hundreds of agents/tasks; “hard” GAP with thousands of binaries is still nontrivial [Savelsbergh 1997]. LP-based approximations give \(1-1/e\) in some maximum-GAP variants [Fleischer et al. 2006].

**Optimality.** Exact B&B / MIP: global. Greedy residual-profit reductions: constant-factor in restricted variants, not for the quadratic objective here.

**Mapping.** Slots ≈ agents, (servant, CE-bundle) ≈ tasks is **awkward**: there is one shared cost cap, not per-slot capacities. A cleaner GAP-like reading: servants are items, the single team is one knapsack (then it collapses to knapsack, not GAP). Pairwise aura is outside GAP.

**Win / lose.** Lose as the *primary* reduction — we do not have heterogeneous per-slot budgets. Win only as a reminder that “assignment + knapsack” is already NP-hard, so adding aura does not make the problem easier in the worst case. GAP-specific codes are the wrong tool.

**Sources.** Ross, G. T. & Soland, R. M. (1975). A branch and bound algorithm for the generalized assignment problem. *Mathematical Programming* 8, 91–103. Fisher, M. L., Jaikumar, R. & Van Wassenhove, L. N. (1986). A multiplier adjustment method for the generalized assignment problem. *Management Science* 32(9), 1095–1103. Fleischer, L., Goemans, M. X., Mirrokni, V. S. & Sviridenko, M. (2006). Tight approximation algorithms for maximum general assignment problems. *SODA ’06*, 611–620. Kellerer, H., Pferschy, U. & Pisinger, D. (2004). *Knapsack Problems*. Springer.

---

### 4.3 0-1 knapsack and multiple-choice knapsack (MCKP) + DP

**Formal name.** 0-1 knapsack (KP): select a subset of items with weights/profits under capacity \(W\) [Dantzig 1957; Bellman 1957; Martello & Toth 1990; Kellerer et al. 2004]. Decision KP / subset-sum is NP-complete [Karp 1972; Garey & Johnson 1979] but only **weakly** so: DP is \(O(nW)\) pseudo-polynomial [Bellman 1957; Wikipedia “Knapsack problem” as pointer]. MCKP: items partitioned into classes, pick (at most) one per class [Sinha & Zoltners 1979; Pisinger 1995]. MCKP DP is \(O(nW)\) in the total number of items [Kellerer et al. 2004; Pisinger 1995]. FPTAS exists for KP and MCKP [Lawler 1979; Chandra, Hirschberg & Wong-style schemes; Bansal & Venkaiah-type MCKP FPTAS].

**Scale.** \(n\) in the hundreds of thousands with moderate \(W\) is routine for KP. Here \(W\le 118\), \(n\sim 436\), so a **linear** knapsack is trivial.

**Optimality.** Exact for linear profits. FPTAS: \((1-\varepsilon)\) in time polynomial in \(n,1/\varepsilon\). **Does not** apply unchanged to QKP / rank-1 product unless the quadratic term is moved into the state.

**Mapping.**

- *Slots as MCKP classes:* class \(i\) = slot \(i\); item = (servant, CE-bundle) with weight = servant cost + charged CE cost, profit = \(1+\mathrm{CEBonus}\) (linear part). Failures: servant uniqueness across classes; \(A\cdot G\) unknown until the whole team is chosen.
- *Servants as 0-1 items, state-augmented DP (recommended exact DP):* process servants \(s=1..S\); state \((\text{slots used},\, w,\, A,\, G)\). Transition: skip, or place \(s\) in a compatible remaining slot-kind (normal / crown / support / locked) with a CE choice, updating cost / \(A\) / \(G\). After the last servant, add \(0.25\cdot A\cdot G\). Slot-kinds keep the “slots used” dimension at \(\le N+1=7\), not \(2^S\).

State count (no CE in the state):

\[
S\cdot (N+1)\cdot (W+1)\cdot (N+1)\cdot (N+1) \approx 436\cdot 7\cdot 119\cdot 7\cdot 7 \approx 1.8\times 10^{7}.
\]

Times \(\sim 13\) CE choices \(\approx 2.3\times 10^{8}\) transitions — interactive-browser feasible if implemented carefully. All-crown CE pairs (\(13^{2}\)) push toward \(3\times 10^{9}\) unless CE is deferred to a matching subroutine (4.1). Limited CE inventory can be dropped from the DP and repaired by a second-stage assignment, or tracked only for the few unique CEs (the single 10% copy).

**Win / lose.** **Strongest exact custom algorithm** for this scale: \(N\) and \(W\) are tiny, aura is a 2-dimensional counter, CE types are tiny. Loses if one naively tracks used-servant bitsets (\(2^{436}\)) or full CE inventories (\(3^{11}\) copies). Must treat servants as items and slots as a small counter.

**Sources.** Bellman, R. (1957). *Dynamic Programming*. Princeton University Press. Dantzig, G. B. (1957). Discrete-variable extremum problems. *Operations Research* 5(2), 266–277. Karp, R. M. (1972). Reducibility among combinatorial problems. In Miller & Thatcher (eds.), *Complexity of Computer Computations*, 85–103. Plenum. Garey, M. R. & Johnson, D. S. (1979). *Computers and Intractability*. W. H. Freeman. Sinha, A. & Zoltners, A. A. (1979). The multiple-choice knapsack problem. *Operations Research* 27(3), 503–515. Pisinger, D. (1995). A minimal algorithm for the multiple-choice knapsack problem. *EJOR* 83, 394–410. Martello, S. & Toth, P. (1990). *Knapsack Problems: Algorithms and Computer Implementations*. Wiley. Lawler, E. L. (1979). Fast approximation algorithms for knapsack problems. *Mathematics of Operations Research* 4(4), 339–356.

---

### 4.4 Quadratic knapsack (QKP)

**Formal name.** \(\max x^\top P x\) s.t. \(w^\top x \le W\), \(x\in\{0,1\}^n\), \(P\ge 0\) [Gallo, Hammer & Simeone 1980]. Strongly NP-hard by reduction from Clique [Gallo et al. 1980; Pisinger 2007; Garey & Johnson 1979]. No FPTAS for general QKP; with mixed-sign profits, no poly-time constant-factor approximation unless P=NP [Rader & Woeginger 2002]. Special graphs (edge series-parallel) admit DP / FPTAS [Rader & Woeginger 2002].

**Scale.** Caprara, Pisinger & Toth (1999) solve random QKP with **up to 400 binaries** by Lagrangian reformulation + B&B (bounds typically within 1% of optimum, node processing linear expected time). That \(n\) is the same order as this servant pool — but their instances are *dense generic* quadratics, not rank-1.

**Optimality.** Exact B&B / MIP linearizations (Fortet / Glover–Woolsey products [Fortet 1960; Glover & Woolsey 1974]; RLT [Adams & Sherali 1986]). Heuristics / metaheuristics: no guarantee [Pisinger 2007; Galli, Martello & Toth 2025].

**Mapping.** Items = servants (or servant+CE bundles). Linear profits = base 100% + CE. Pairwise profits: \(p_{ij}=0.25\) when \(i\) can gain and \(j\) emits aura (and symmetrically as needed so \(i\) cap-16 receives their own 0.25). Extra constraints: at most \(N\) items; CE cost/inventory; slot types. So this is QKP **plus** cardinality and a side assignment. Because \(P = \tfrac14 (g a^\top + \cdots)\) is rank-1 (vectors \(g=\mathrm{canGain}\), \(a=\mathrm{aura}\)), general QKP machinery is heavier than needed.

**Win / lose.** Wins as the **right complexity classification** of the servant-selection core, and as a source of linearizations for MIP. Loses as a drop-in solver: (i) CE layer is missing, (ii) general QKP B&B is overkill vs state-augmented DP, (iii) worst-case inapproximability of *general* QKP should not scare us — our quadratic is rank-1 and \(N\le 6\).

**Sources.** Gallo, G., Hammer, P. L. & Simeone, B. (1980). Quadratic knapsack problems. *Mathematical Programming Studies* 12, 132–149. Pisinger, D. (2007). The quadratic knapsack problem—a survey. *Discrete Applied Mathematics* 155(5), 623–648. Caprara, A., Pisinger, D. & Toth, P. (1999). Exact solution of the quadratic knapsack problem. *INFORMS Journal on Computing* 11(2), 125–137. Galli, L., Martello, S. & Toth, P. (2025). The quadratic knapsack problem. *EJOR* (invited review; doi:10.1016/j.ejor.2024.12.032). Rader, D. J. & Woeginger, G. J. (2002). The quadratic 0–1 knapsack problem with series–parallel support. *Operations Research Letters* 30, 159–166. Fortet, R. (1960). Applications de l’algèbre de Boole en recherche opérationnelle. *Revue Française de Recherche Opérationnelle* 4, 17–26. Glover, F. & Woolsey, E. (1974). Converting the 0-1 polynomial programming problem to a 0-1 linear program. *Operations Research* 22(1), 180–182. Adams, W. P. & Sherali, H. D. (1986). A tight linearization and an algorithm for zero-one quadratic programming problems. *Management Science* 32(10), 1274–1290.

---

### 4.5 Quadratic assignment (QAP)

**Formal name.** Assign \(n\) facilities to \(n\) locations; cost \(\sum_{i,j,p,q} c_{ijpq}\, x_{ip}x_{jq}\) [Koopmans & Beckmann 1957; Lawler 1963]. Strongly NP-hard; no polynomial \(\varepsilon\)-approximation unless P=NP [Sahni & Gonzalez 1976]. Exact methods stall around \(n\approx 20\)–30 for general QAP [Çela survey / QAPLIB experience; Wikipedia “Quadratic assignment problem” as pointer].

**Scale.** \(n=6\) QAP is easy — but that would mean 6 servants already chosen, assigned to 6 slots. The combinatorial blow-up here is **which** servants, not how they permute across nearly identical slots.

**Optimality.** Exact only at tiny \(n\). Heuristics (SA was demonstrated on QAP / placement [Kirkpatrick, Gelatt & Vecchi 1983]) have no guarantee.

**Mapping.** Slots ≈ locations, servants ≈ facilities, “flow” ≈ aura interaction. The distance matrix is essentially all-ones (everyone affects everyone), so the QAP collapses to a **subset** problem (QKP), not a permutation problem. Crown/support make slots slightly heterogeneous; that is still not a genuine QAP distance structure.

**Win / lose.** Lose as the primary model. Do not import QAP inapproximability as a statement about *this* planner. Win only as a warning: if one encoded the problem as a dense \(n=436\) QAP, it would be the wrong, intractable encoding.

**Sources.** Koopmans, T. C. & Beckmann, M. (1957). Assignment problems and the location of economic activities. *Econometrica* 25(1), 53–76. Lawler, E. L. (1963). The quadratic assignment problem. *Management Science* 9(4), 586–599. Sahni, S. & Gonzalez, T. (1976). P-complete approximation problems. *Journal of the ACM* 23(3), 555–565.

---

### 4.6 Set cover (and hitting set)

**Formal name.** Given universe \(U\) and sets \(\mathcal{S}\), pick a min-size (or min-weight) subcollection whose union is \(U\) [Karp 1972, SET COVER]. NP-complete. Greedy is \(H_n \le \ln n+1\) [Johnson 1974; Chvátal 1979]; this is essentially tight [Feige 1998; Dinur & Steurer 2014].

**Scale.** Greedy is linear in input size. Exact ILP is standard and works for modest \(|U|\).

**Optimality.** Exact via ILP/B&B. Greedy: \(\ln n\) factor for *covering*, not for maximizing bond yield.

**Mapping.** One *could* call “need a 20% CE on this servant” a covering element — but the real objective is a **sum of bonuses**, empty slots are allowed, and over-covering (two CEs on a crown) is valuable. Bond-15 aura “covers” everyone at once; that is a single global flag, not a set-cover instance.

**Win / lose.** Lose. Do not use set-cover greedy as the team optimizer. The \(\ln n\) theory is irrelevant to \(N\le 6\).

**Sources.** Karp (1972), op. cit. Johnson, D. S. (1974). Approximation algorithms for combinatorial problems. *JCSS* 9(3), 256–278. Chvátal, V. (1979). A greedy heuristic for the set-covering problem. *Mathematics of Operations Research* 4(3), 233–235. Feige, U. (1998). A threshold of \(\ln n\) for approximating set cover. *Journal of the ACM* 45(4), 634–652.

---

### 4.7 Uncapacitated facility location (UFL)

**Formal name.** Open a subset of facilities (opening costs) and assign every client to an open facility (connection costs) [Balinski 1965/66; Stollsteimer 1963; Cornuéjols, Fisher & Nemhauser 1977; Cornuéjols, Nemhauser & Wolsey 1990]. NP-hard [Cornuéjols et al. 1990]. Maximization / “bank float” greedy has worst-case \(1-1/e\) [Cornuéjols, Fisher & Nemhauser 1977]. Metric minimization UFL has constant-factor approximations (e.g. 1.488 [Li 2013]); non-metric UFL is \(\Theta(\log n)\) [Hochbaum 1982].

**Scale.** Classic Lagrangian / B&B handles hundreds of sites; modern MIP handles larger metric instances.

**Optimality.** Exact MIP/B&B. Greedy: \(1-1/e\) on the *maximization UFL* analyzed in 1977, not on this yield function.

**Mapping.** Bond-15 servants ≈ facilities that serve **all** gainers with identical “connection” 0.25. Opening cost ≈ their slot + servant cost (and they may score 0 themselves). This captures only the aura subplot. CE matching and the 100% base for every gainer are outside UFL.

**Win / lose.** Useful intuition: “open” cheap aura emitters if they fit, then fill remaining slots with high linear (base+CE) gainers. That is a good **greedy constructive heuristic**, not a complete solver. Lose if treated as the formal problem.

**Sources.** Cornuéjols, G., Fisher, M. L. & Nemhauser, G. L. (1977). Location of bank accounts to optimize float. *Management Science* 23(8), 789–810. Cornuéjols, G., Nemhauser, G. L. & Wolsey, L. A. (1990). The uncapacitated facility location problem. In Mirchandani & Francis (eds.), *Discrete Location Theory*, 119–171. Wiley. Hochbaum, D. S. (1982). Heuristics for the fixed cost median problem. *Mathematical Programming* 22, 148–162. Li, S. (2013). A 1.488 approximation algorithm for the uncapacitated facility location problem. *Information and Computation* 222, 45–58.

---

### 4.8 Integer linear / mixed-integer programming (ILP / MILP) and CP-SAT

**Formal name.** 0-1 ILP is NP-complete [Karp 1972, INTEGER PROGRAMMING; Cook 1971 for SAT as the root]. MILP = some variables integer. Modern solvers: LP-based branch-and-cut [Land & Doig 1960; Dakin 1965; Achterberg 2007/2009] plus primal heuristics. CP-SAT is a constraint-programming / SAT hybrid for bounded integers [Google OR-Tools CP-SAT docs]. Quadratic products are linearized [Fortet 1960; Glover & Woolsey 1974] or handed to a MIQP solver (SCIP lists support for nonconvex integer quadratic [OR-Tools MathOpt solver-type notes]).

**Scale.** MIPLIB 2017 instances range from tiny to hundreds of thousands of variables; difficulty is structure, not raw counts [Gleixner et al. 2021]. Achterberg’s SCIP thesis: CIP/MIP competitive on pure MIP with full B&B infrastructure (branching, cuts, presolve, heuristics) [Achterberg 2007; Achterberg 2009]. OR-Tools: CP-SAT “designed for integer programming problems and is generally faster than MPSolver” on combinatorial models; statuses include `OPTIMAL` / `FEASIBLE` / `INFEASIBLE` / `UNKNOWN` (time limit) [Google OR-Tools, CP-SAT solver]. This instance: \(\sim 436\times 6 + 13\times 6\times 2 \approx 2800\) binaries, plus a handful of integer counters \(A,G\in\{0,\ldots,6\}\) — **small**.

**Optimality.** `OPTIMAL` = global proof. Time-limit `FEASIBLE` = heuristic with a bound (MIP gap). That anytime gap is the cleanest “balanced” exact/heuristic hybrid.

**Mapping (sketch, not code).**

- Binary \(x_{si}\): servant \(s\) in slot \(i\). At most one servant per slot; each servant in at most one slot; locks fix some \(x_{si}\).
- Binary \(y_{cip}\): CE type \(c\) in slot \(i\), CE-position \(p\in\{1,2\}\). Position 2 only if crown(\(i\)). CE requires a servant. Inventory: \(\sum_{i,p} y_{cip} \le \mathrm{stock}_c\) except support (unlimited) and 5% (unlimited).
- Cost: \(\sum_{s,i} \mathrm{cost}_s x_{si} + 16\cdot\sum_i \mathbf{1}[\text{slot }i\text{ has a CE and is not support}] \le W\). Crown: charge 16 once if any CE present.
- \(A = \sum_{s,i} \mathrm{aura}_s x_{si}\), \(G = \sum_{s,i} \mathrm{canGain}_s x_{si}\).
- Objective: \(G + \sum_{s,i,c,p} \mathrm{canGain}_s\cdot\mathrm{match}(s,c)\, y_{cip} + 0.25\cdot A\cdot G\). Product \(A\cdot G\): enumerate \(A=0..N\) as a parameter, or add 49 binaries for pairs \((a,g)\), or McCormick on two integers in \(\{0..6\}\) (exact on a 7×7 domain).

Support slot: omit servant variables; only \(y_{c,\mathrm{sup},p}\).

**Win / lose.** **Best “global exact” productization path** if a WASM/native solver is acceptable (CBC, HiGHS, SCIP, OR-Tools CP-SAT). Modeling time is short; performance should be milliseconds–low seconds on this size. Loses if the app must stay dependency-free JS and you refuse to ship a solver. Modeling mistakes (forgetting uniqueness, double-charging crown) are the main risk, not solver scale.

**Sources.** Karp (1972); Cook, S. A. (1971). The complexity of theorem-proving procedures. *STOC*, 151–158. Land, A. H. & Doig, A. G. (1960). An automatic method of solving discrete programming problems. *Econometrica* 28(3), 497–520. Dakin, R. J. (1965). A tree-search algorithm for mixed integer programming problems. *The Computer Journal* 8(3), 250–255. Achterberg, T. (2007). *Constraint Integer Programming* (PhD thesis, TU Berlin). Achterberg, T. (2009). SCIP: solving constraint integer programs. *Mathematical Programming Computation* 1, 1–41. Gleixner, A. et al. (2021). MIPLIB 2017: data-driven compilation of the 6th mixed-integer programming library. *Mathematical Programming Computation* 13, 443–490. Google OR-Tools. CP-SAT solver. https://developers.google.com/optimization/cp/cp_solver (official docs; statuses and integer restriction). Google OR-Tools MathOpt `SolverType`: `SOLVER_TYPE_CP_SAT`, `SOLVER_TYPE_GSCIP` (MIP / nonconvex integer quadratic).

---

### 4.9 Custom branch-and-bound (not via a MIP solver)

**Formal name.** Branch-and-bound: partition the search space; prune a subset when a bound shows it cannot beat the incumbent [Land & Doig 1960; Little, Murty, Sweeney & Karel 1963 coined the name on TSP; Dakin 1965 binary branching]. Completeness + optimality if bounds are valid and the partition covers all integer points.

**Scale.** Quality of the bound dominates. Caprara–Pisinger–Toth QKP B&B: \(n\le 400\) with tight Lagrangian bounds [Caprara et al. 1999]. Here a simple bound already works: remaining slots \(\times\) (1 + best CE + \(0.25\cdot(A+\text{remaining auras})\)) plus current linear score, minus cost infeasibility.

**Optimality.** Global if run to completion. Can stop at a time/node limit (anytime, no gap unless a dual bound is kept).

**Mapping.** Branch on “which servant occupies slot \(i\)” (or “is servant \(s\) used?”). After a servant set is fixed, CE assignment is exact (4.1). Branching order: locked slots first, then crown, then support CEs, then high-impact aura candidates. Bound: relax uniqueness or relax cost to a fractional knapsack of remaining best linear efficiencies [Dantzig 1957 greedy for LP-knapsack].

**Win / lose.** Wins if you want a **solver-free exact** method with easy lock/crown/support constraints in code. With \(N\le 6\) and dominance (same types, lower cost, canGain, aura) the tree can be tiny. Loses if branching is naive over \(P(S,N)\) without dominance / cost bounds — then it is just enumeration.

**Sources.** Land & Doig (1960); Little, J. D. C., Murty, K. G., Sweeney, D. W. & Karel, C. (1963). An algorithm for the traveling salesman problem. *Operations Research* 11(6), 972–989. Dakin (1965); Dantzig (1957); Caprara et al. (1999).

---

### 4.10 Beam search

**Formal name.** Level-wise search that keeps only the best \(\beta\) partial solutions (beam width). Origin: Lowerre’s Harpy “locus model” — search only a few best paths in parallel [Lowerre 1976]. Term “beam search” in use by 1977 [CMU speech-understanding summary; Wikipedia “Beam search” as pointer]. Scheduling: filtered beam search [Ow & Morton 1988]. Width 1 = hill climbing; \(\beta=\infty\) = breadth-first / best-first [Norvig 1992]. **Not complete, not optimal** [standard AI search texts; Wikipedia pointer].

**Scale.** Time \(\approx O(N\cdot \beta\cdot F\log(\beta F))\) with fan-out \(F\) (servants still affordable at that node). Memory \(O(\beta F)\). \(\beta=50\)–\(500\), \(F\sim 100\)–\(400\), \(N=6\) is milliseconds–tens of milliseconds in JS.

**Optimality.** None. Incomplete: the optimal team can be pruned at an early slot if its prefix looks weak (e.g. a cap-15 aura Mash-like opener that scores 0 locally but lifts everyone later). Mitigations: score prefixes with an **estimated** remaining aura and remaining CE, or run several beams (aura-first vs CE-first).

**Mapping.** Levels = slots (lock-fixed slots skipped). A state = partial team + remaining cost + remaining CE stock + current \(A,G\). Expand by placing a servant+CE (or empty). Rank by current yield + admissible/optimistic leftover (remaining slots \(\times\) best possible per-slot yield under leftover cost). Support level: CE only.

**Win / lose.** **Best balanced candidate**: predictable latency, natural handling of locks/crown/support, easy to return one incumbent. Loses global optimality; aura delayed-reward is the main failure mode (fixable with a better prefix heuristic). Better than GA/SA when \(N=6\) because the depth is tiny and the fan-out is the whole pool — a wide beam already covers a huge fraction of “reasonable” teams.

**Sources.** Lowerre, B. T. (1976). *The Harpy Speech Recognition System* (PhD thesis, Carnegie Mellon University). Ow, P. S. & Morton, T. E. (1988). Filtered beam search in scheduling. *International Journal of Production Research* 26(1), 35–62. Norvig, P. (1992). *Paradigms of Artificial Intelligence Programming*. Morgan Kaufmann, p. 196.

---

### 4.11 Genetic algorithms

**Formal name.** Population-based search with selection, crossover, mutation [Holland 1975]. No optimality guarantee; schema / building-block arguments are not approximation theorems [Holland 1975]. Widely used as a heuristic on QAP, GAP, knapsacks [survey literature; not a substitute for exact methods at this size].

**Scale.** Populations of 50–200 and tens of generations are cheap here. Encoding length is small (\(N\) servant IDs + CE IDs). Constraint handling (cost, uniqueness, inventory) needs repair or death penalties.

**Optimality.** None. Stochastic; may miss the optimum even after long runs.

**Mapping.** Chromosome: per slot (servant | empty, CE1, CE2). Crossover: swap slots / exchange servant sets. Mutation: replace one servant or CE, toggle empty, swap two slots. Fitness = yield if cost/inventory feasible, else penalize. Support genes: CE only.

**Win / lose.** Lose as a **first** choice: \(N\le 6\) is too small to need a population heuristic, and crossover of two good teams often violates uniqueness/cost, wasting evaluations. Win only if you want diverse “several good teams” for UI and already have a fast fitness. A MIP or beam will usually dominate GA on both quality and latency.

**Sources.** Holland, J. H. (1975). *Adaptation in Natural and Artificial Systems*. University of Michigan Press (MIT Press reprint 1992).

---

### 4.12 Simulated annealing

**Formal name.** Metropolis MCMC [Metropolis et al. 1953] applied to combinatorial landscapes: accept worsening moves with probability \(\exp(-\Delta/T)\), cool \(T\) [Kirkpatrick, Gelatt & Vecchi 1983; Černý 1985 independently on TSP]. Kirkpatrick et al. report practical success on placement / TSP with thousands of cities and effort scaling like \(N\) or a small power of \(N\) [Kirkpatrick et al. 1983]. No finite-time optimality guarantee; asymptotic convergence needs impractically slow cooling (Hajek-type conditions), not used in practice.

**Scale.** Millions of move evaluations are easy: a swap’s \(\Delta\) yield can be updated in \(O(N)\) from \(A,G\) and the two slots’ CE bonuses.

**Optimality.** Heuristic. Local minima exist (e.g. a high-CE 5★ block that leaves no room for a 0-cost aura Mash + CE). SA can escape them; schedule quality is empirical.

**Mapping.** State = full team. Moves: replace servant; replace CE; swap two slots; add/remove occupant; move crown CE pair; change support CEs. Reject infeasible cost/inventory (or use a penalty and a repair). Start from a greedy construction (4.7 / efficiency sort).

**Win / lose.** **Best lightweight local-optima family** if exact DP/MIP is declined: tiny state, cheap \(\Delta\), natural anytime. Loses a proof of optimality. For \(N=6\) a well-implemented VNS (4.13) may need fewer parameters than a cooling schedule.

**Sources.** Metropolis, N., Rosenbluth, A. W., Rosenbluth, M. N., Teller, A. H. & Teller, E. (1953). Equation of state calculations by fast computing machines. *J. Chem. Phys.* 21(6), 1087–1092. Kirkpatrick, S., Gelatt, C. D. & Vecchi, M. P. (1983). Optimization by simulated annealing. *Science* 220(4598), 671–680. Černý, V. (1985). Thermodynamical approach to the traveling salesman problem: An efficient simulation algorithm. *JOTA* 45, 41–51.

---

### 4.13 Local search, tabu search, variable neighborhood search

**Formal name.** Iterative improvement in a neighborhood [Papadimitriou & Steiglitz 1982; Aarts & Lenstra 1997]. Tabu search: short-term memory forbids recent reverse moves; intensification / diversification memories [Glover 1986; Glover 1989]. VNS: when a neighborhood’s local optimum is reached, switch neighborhood (and kick) because a local optimum in one neighborhood is typically not local in another [Mladenović & Hansen 1997].

**Scale.** Neighborhoods of size \(O(S N + C N)\) (replace servant or CE) are ~2–3k evaluations; evaluating all of them per iteration is fine. Multi-swap neighborhoods grow as \(O(S^2)\) and should be sampled.

**Optimality.** Local optimum only, relative to the chosen neighborhoods. No a-priori gap. Tabu/VNS empirically escape more local optima than pure hill-climbing [Glover 1989; Mladenović & Hansen 1997].

**Mapping.** Neighborhoods, in VNS order:

1. CE-only (including support / crown pair), exact assignment optional (4.1).
2. Replace one servant, keep CEs if still legal else reassign.
3. Swap two team members with two pool members (or empty ↔ filled).
4. Toggle a “should we run an extra aura emitter?” kick: force-insert a cheap bond-15, drop the lowest linear contributor, re-pack cost.

Locks: drop locked genes from the neighborhood.

**Win / lose.** **Best “performance first, local OK” candidate** together with SA. Very predictable if you cap iterations. Loses global proof. Risk: neighborhoods that never insert a 0-score aura unit will miss the \(0.25\cdot A\cdot G\) jackpot — so include an explicit aura neighborhood.

**Sources.** Glover, F. (1986). Future paths for integer programming and links to artificial intelligence. *Computers & Operations Research* 13(5), 533–549. Glover, F. (1989). Tabu search—Part I. *ORSA Journal on Computing* 1(3), 190–206. Mladenović, N. & Hansen, P. (1997). Variable neighborhood search. *Computers & Operations Research* 24(11), 1097–1100. Papadimitriou, C. H. & Steiglitz, K. (1982). *Combinatorial Optimization: Algorithms and Complexity*. Prentice-Hall.

---

## 5. Recommended portfolio (for this \(N\le 6\), \(S\sim 10^2\)–\(10^3\), \(\sim 10\) CE types)

| Role | Method | Why it fits |
|---|---|---|
| **Global / exact** | (A) State-augmented DP over servants with state \((\text{slots}, w, A, G)\) + CE matching subroutine, or (B) 0-1 ILP / CP-SAT with linearized \(A\cdot G\) | \(W\le 118\), \(N\le 6\), rank-1 aura, \(\sim 10^{7}\)–\(10^{8}\) DP cells or \(\sim 3\times 10^{3}\) binaries. Both can prove optimality. |
| **Local / fast** | VNS or SA on replace/swap/CE/aura neighborhoods, seeded by efficiency greedy | Evaluations are \(O(N)\); local optima acceptable per the spec; must include an “insert aura emitter” move. |
| **Balanced** | Beam search (\(\beta \sim 10^{2}\)–\(10^{3}\)) with leftover-cost + expected-aura prefix score; **or** MIP/CP-SAT with a 50–200 ms time limit and gap | Latency cap; beam is dependency-free; MIP gives a dual gap when time-limited. |

**Do not lead with:** general QAP encodings, set-cover greedy, standalone Hungarian, or a genetic algorithm.

**Dominance preprocessing (all methods):** bucket servants by \((\mathrm{cost}, \mathrm{typeSet}, \mathrm{canGain}, \mathrm{auraKind})\). Inside a bucket, keep one (or a few for locks). 436 catalog entries collapse far below that once the user applies class/rarity/hidden filters.

**Two-stage decomposition (all methods):** (1) choose servants + which slots; (2) assign CEs by assignment / greedy-by-match then generic fill. Stage (2) is optimal or near-optimal because CE effects do not interact except through inventory and the single 10% card.

---

## 6. Complexity cheat-sheet for *this* instance

| If we only had… | Complexity |
|---|---|
| Linear scores, no cost, assign CEs | Assignment, polynomial [Kuhn 1955] |
| Linear scores, one cost cap, no uniqueness across slots | KP / MCKP, weakly NP-hard, \(O(nW)\) [Bellman 1957; Pisinger 1995] |
| Subset of servants, cost, pairwise aura, no slots/CEs | QKP, strongly NP-hard in general [Gallo et al. 1980] — **but** rank-1 + \(N\le 6\) is poly in \(S\) via DP \(O(S N^2 W)\) |
| Full problem | In NP (certificate = the team). NP-hard in the worst case as a KP/QKP generalization, **not** a barrier at the stated sizes. |

---

## References

1. Adams, W. P. & Sherali, H. D. (1986). A tight linearization and an algorithm for zero-one quadratic programming problems. *Management Science* 32(10), 1274–1290.
2. Achterberg, T. (2007). *Constraint Integer Programming*. PhD thesis, Technische Universität Berlin.
3. Achterberg, T. (2009). SCIP: solving constraint integer programs. *Mathematical Programming Computation* 1, 1–41.
4. Bellman, R. (1957). *Dynamic Programming*. Princeton University Press.
5. Caprara, A., Pisinger, D. & Toth, P. (1999). Exact solution of the quadratic knapsack problem. *INFORMS Journal on Computing* 11(2), 125–137.
6. Černý, V. (1985). Thermodynamical approach to the traveling salesman problem: An efficient simulation algorithm. *Journal of Optimization Theory and Applications* 45, 41–51.
7. Chvátal, V. (1979). A greedy heuristic for the set-covering problem. *Mathematics of Operations Research* 4(3), 233–235.
8. Cook, S. A. (1971). The complexity of theorem-proving procedures. *Proceedings of the 3rd Annual ACM Symposium on Theory of Computing*, 151–158.
9. Cornuéjols, G., Fisher, M. L. & Nemhauser, G. L. (1977). Location of bank accounts to optimize float: An analytic study of exact and approximate algorithms. *Management Science* 23(8), 789–810.
10. Cornuéjols, G., Nemhauser, G. L. & Wolsey, L. A. (1990). The uncapacitated facility location problem. In P. B. Mirchandani & R. L. Francis (eds.), *Discrete Location Theory*, 119–171. Wiley.
11. Dakin, R. J. (1965). A tree-search algorithm for mixed integer programming problems. *The Computer Journal* 8(3), 250–255.
12. Dantzig, G. B. (1957). Discrete-variable extremum problems. *Operations Research* 5(2), 266–277.
13. Feige, U. (1998). A threshold of \(\ln n\) for approximating set cover. *Journal of the ACM* 45(4), 634–652.
14. Fisher, M. L., Jaikumar, R. & Van Wassenhove, L. N. (1986). A multiplier adjustment method for the generalized assignment problem. *Management Science* 32(9), 1095–1103.
15. Fleischer, L., Goemans, M. X., Mirrokni, V. S. & Sviridenko, M. (2006). Tight approximation algorithms for maximum general assignment problems. *SODA 2006*, 611–620.
16. Fortet, R. (1960). Applications de l’algèbre de Boole en recherche opérationnelle. *Revue Française de Recherche Opérationnelle* 4, 17–26.
17. Gallo, G., Hammer, P. L. & Simeone, B. (1980). Quadratic knapsack problems. *Mathematical Programming Studies* 12, 132–149.
18. Galli, L., Martello, S. & Toth, P. (2025). The quadratic knapsack problem. *European Journal of Operational Research*. doi:10.1016/j.ejor.2024.12.032.
19. Garey, M. R. & Johnson, D. S. (1979). *Computers and Intractability: A Guide to the Theory of NP-Completeness*. W. H. Freeman.
20. Gleixner, A., Hendel, G., Gamrath, G., Achterberg, T., et al. (2021). MIPLIB 2017: data-driven compilation of the 6th mixed-integer programming library. *Mathematical Programming Computation* 13, 443–490.
21. Glover, F. (1986). Future paths for integer programming and links to artificial intelligence. *Computers & Operations Research* 13(5), 533–549.
22. Glover, F. (1989). Tabu search—Part I. *ORSA Journal on Computing* 1(3), 190–206.
23. Glover, F. & Woolsey, E. (1974). Converting the 0-1 polynomial programming problem to a 0-1 linear program. *Operations Research* 22(1), 180–182.
24. Google OR-Tools. CP-SAT solver (official documentation). https://developers.google.com/optimization/cp/cp_solver
25. Hochbaum, D. S. (1982). Heuristics for the fixed cost median problem. *Mathematical Programming* 22, 148–162.
26. Holland, J. H. (1975). *Adaptation in Natural and Artificial Systems*. University of Michigan Press.
27. Johnson, D. S. (1974). Approximation algorithms for combinatorial problems. *Journal of Computer and System Sciences* 9(3), 256–278.
28. Karp, R. M. (1972). Reducibility among combinatorial problems. In R. E. Miller & J. W. Thatcher (eds.), *Complexity of Computer Computations*, 85–103. Plenum.
29. Kellerer, H., Pferschy, U. & Pisinger, D. (2004). *Knapsack Problems*. Springer.
30. Kirkpatrick, S., Gelatt, C. D. & Vecchi, M. P. (1983). Optimization by simulated annealing. *Science* 220(4598), 671–680.
31. Koopmans, T. C. & Beckmann, M. (1957). Assignment problems and the location of economic activities. *Econometrica* 25(1), 53–76.
32. Kuhn, H. W. (1955). The Hungarian method for the assignment problem. *Naval Research Logistics Quarterly* 2(1–2), 83–97.
33. Land, A. H. & Doig, A. G. (1960). An automatic method of solving discrete programming problems. *Econometrica* 28(3), 497–520.
34. Lawler, E. L. (1963). The quadratic assignment problem. *Management Science* 9(4), 586–599.
35. Lawler, E. L. (1979). Fast approximation algorithms for knapsack problems. *Mathematics of Operations Research* 4(4), 339–356.
36. Li, S. (2013). A 1.488 approximation algorithm for the uncapacitated facility location problem. *Information and Computation* 222, 45–58.
37. Little, J. D. C., Murty, K. G., Sweeney, D. W. & Karel, C. (1963). An algorithm for the traveling salesman problem. *Operations Research* 11(6), 972–989.
38. Lowerre, B. T. (1976). *The Harpy Speech Recognition System*. PhD thesis, Carnegie Mellon University.
39. Martello, S. & Toth, P. (1990). *Knapsack Problems: Algorithms and Computer Implementations*. Wiley.
40. Metropolis, N., Rosenbluth, A. W., Rosenbluth, M. N., Teller, A. H. & Teller, E. (1953). Equation of state calculations by fast computing machines. *The Journal of Chemical Physics* 21(6), 1087–1092.
41. Mladenović, N. & Hansen, P. (1997). Variable neighborhood search. *Computers & Operations Research* 24(11), 1097–1100.
42. Norvig, P. (1992). *Paradigms of Artificial Intelligence Programming*. Morgan Kaufmann.
43. Ow, P. S. & Morton, T. E. (1988). Filtered beam search in scheduling. *International Journal of Production Research* 26(1), 35–62.
44. Papadimitriou, C. H. & Steiglitz, K. (1982). *Combinatorial Optimization: Algorithms and Complexity*. Prentice-Hall.
45. Pisinger, D. (1995). A minimal algorithm for the multiple-choice knapsack problem. *European Journal of Operational Research* 83, 394–410.
46. Pisinger, D. (2007). The quadratic knapsack problem—a survey. *Discrete Applied Mathematics* 155(5), 623–648.
47. Rader, D. J. & Woeginger, G. J. (2002). The quadratic 0–1 knapsack problem with series–parallel support. *Operations Research Letters* 30, 159–166.
48. Ross, G. T. & Soland, R. M. (1975). A branch and bound algorithm for the generalized assignment problem. *Mathematical Programming* 8, 91–103.
49. Sahni, S. & Gonzalez, T. (1976). P-complete approximation problems. *Journal of the ACM* 23(3), 555–565.
50. Savelsbergh, M. (1997). A branch-and-price algorithm for the generalized assignment problem. *Operations Research* 45(6), 831–841.
51. Sinha, A. & Zoltners, A. A. (1979). The multiple-choice knapsack problem. *Operations Research* 27(3), 503–515.

**Pointers (not primary):** Wikipedia articles *Assignment problem*, *Knapsack problem*, *Quadratic assignment problem*, *Generalized assignment problem*, *Set cover problem*, *Integer programming*, *Beam search* — used only to name algorithms and locate the originals above.

**Instance data:** `src/assets/data.json` (436 servants, 8 attribute types); `src/utils/data.ts` (class CE types); `docs/自动配队计算算法需求.md` (cost table, aura rules, crown/support, objective).
