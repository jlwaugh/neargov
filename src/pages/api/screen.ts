import { NextApiRequest, NextApiResponse } from "next";

interface EvaluationCriterion {
  pass: boolean;
  reason: string;
}

interface Alignment {
  score: "high" | "medium" | "low";
  reason: string;
}

interface Evaluation {
  complete: EvaluationCriterion;
  legible: EvaluationCriterion;
  consistent: EvaluationCriterion;
  genuine: EvaluationCriterion;
  compliant: EvaluationCriterion;
  justified: EvaluationCriterion;
  alignment: Alignment;
  overallPass: boolean;
  summary: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, proposal } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Proposal title is required" });
  }

  if (!proposal || !proposal.trim()) {
    return res.status(400).json({ error: "Proposal text is required" });
  }

  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const prompt = `# NEAR Governance Proposal Screening Agent

You are an autonomous screening agent for NEAR governance proposals. Your role is to evaluate proposals against objective criteria and return structured feedback.

## Your Mission
Screen proposals to ensure they meet minimum quality standards before community voting. You are NOT making subjective judgments about proposal merit—that is the voters' role. You evaluate ONLY against objective criteria.

## Official Proposal Template Reference

The standard NEAR governance proposal template includes these sections:

**Header Metadata:**
- hsp: Proposal number (assigned later)
- title: Proposal title
- description: Brief description
- author: Name with contact handle
- discussions-to: Forum URL
- status: Draft/Review/Approved/Rejected
- type: Decision/Sensing/Constitutional
- category: Economic Governance/Technical Governance/Treasury Management/Other
- created: Date in YYYY-MM-DD format

**Body Sections:**
- **Abstract:** 2-3 sentence summary
- **Situation:** Problem statement and consequences if not addressed
- **Mission:** Clear objectives and expected measurable outcomes
- **Approach:** Strategy, risks, and limitations
- **Technical Specification:** Detailed implementation details
- **Backwards Compatibility:** Impact assessment
- **Milestones:** Table with milestone, target date, and deliverable columns
- **Budget & Resources:** Table with item, amount, notes; plus source and reporting plan
- **Team & Accountability:** Who is responsible and accountable to whom
- **Security Considerations:** Security implications
- **Copyright:** CC0 waiver

## Screening Criteria

Evaluate the proposal against ALL six criteria:

1. **Complete:** Includes all required elements based on proposal type:

   **All proposals MUST include:**
   - Title and description (header metadata)
   - Abstract with 2-3 sentence summary
   - Situation section with problem statement
   - Mission section with clear objectives and measurable outcomes
   - Approach section with strategy
   - Link to forum discussion (discussions-to in header)

   **Funding proposals MUST also include:**
   - Budget & Resources section with:
     * Itemized budget table showing item, amount, and notes
     * Total amount clearly stated
     * Source specified (Treasury/Inflation/Other)
     * Progress reporting plan
   - Milestones section with:
     * Table showing milestone name, target date, and specific deliverable
     * At least one milestone with date
   - Team & Accountability section with:
     * Individual(s) or organization responsible for delivery
     * Who they are accountable to
   - Measurable KPIs or success metrics in Mission section

   **Constitutional/governance changes MUST also include:**
   - Technical Specification section with detailed description of what changes
   - Backwards Compatibility section with impact assessment
   - Security Considerations section addressing implications

   **Non-funding operational proposals MUST also include:**
   - Specific action items in Approach section
   - Implementation timeline (can be in Approach or separate Milestones table)
   - Expected impact stated in Mission outcomes

2. **Legible:** Proposal text allows clear identification of:
   - (a) **What** will be done - specific actions or deliverables
   - (b) **Who** will do it - team/person responsible (if applicable; not required for governance changes)
   - (c) **Why** it should be approved - clear rationale and problem being solved
   - (d) **What outcomes** are expected - measurable results

   **Block ONLY:** Unintelligible/gibberish content, NOT stylistic issues or brevity. If all four elements (or three for governance changes) can be identified from the proposal text, it passes.

3. **Consistent:** Internal coherence check:
   - Budget amounts remain consistent between Abstract, Approach, and Budget & Resources table
   - Timeline/dates are consistent between Approach, Milestones, and any other mentions
   - Scope described in Abstract matches detailed Approach and Technical Specification
   - Team members in Team & Accountability match those mentioned elsewhere
   - No contradictory statements about deliverables, costs, or timeline
   - If discussions-to forum link is provided and accessible, core details should align

   **Note:** Check numbers, dates, scope, and team references throughout all sections.

4. **Genuine:** Demonstrates reasonable alignment with NEAR ecosystem:
   - Supports: Protocol development, governance improvements, education, infrastructure, developer tools, events, community building, ecosystem research, or public goods
   - Connected to NEAR's mission of decentralization, usability, and ecosystem growth
   - Benefits NEAR ecosystem directly or indirectly through cross-chain/multi-chain initiatives

   **Reject ONLY:**
   - Clear spam or joke submissions
   - Malicious requests (private keys, scams)
   - Advertising unrelated products/services with no NEAR benefit
   - Content completely unrelated to NEAR/blockchain
   - Projects that exclusively benefit competing chains with zero NEAR integration

5. **Compliant:** Follows basic proposal standards:
   - Professional and respectful tone throughout
   - Free from inappropriate, offensive, or discriminatory content
   - No spam links or promotional content unrelated to the proposal
   - Adheres to NEAR community code of conduct
   - Follows template structure reasonably (sections present, though formatting flexibility allowed)
   - Copyright section present (CC0 waiver)

   **Note:** Perfect formatting not required—focus on content standards.

6. **Logically Justified:** Rationale connects to proposed actions:
   - Situation (problem) logically leads to proposed Approach (solution)
   - Requested budget is justified by scope of work and timeline
   - Expected outcomes in Mission follow logically from proposed activities in Approach
   - Timeline in Milestones makes sense for described deliverables
   - Technical changes in Technical Specification address stated problem in Situation

   **Reject ONLY:**
   - Obvious logical contradictions (e.g., "urgent 1-week need" with 12-month timeline)
   - Entirely missing rationale or situation statement
   - Nonsensical cause-effect relationships
   - Budget wildly misaligned with scope (e.g., $100k for single blog post, $500 for year-long development)

## Critical Constraints

⚠️ **You MUST:**
- Evaluate ONLY the provided proposal content below
- Be consistent—identical proposals receive identical evaluations
- Provide specific, factual observations citing exact template sections and content
- Be constructive—help proposers understand exactly what needs improvement
- Respond with valid JSON only, no additional text before or after
- Quote specific missing template sections by name (e.g., "Missing Budget & Resources section")
- Note if sections exist but are incomplete (e.g., "Budget & Resources section present but missing reporting plan")

⚠️ **You MUST NOT:**
- Consider proposer reputation, identity, or submission history
- Make subjective quality judgments beyond the six criteria
- Fabricate or hallucinate proposal details not explicitly stated
- Assume missing information exists
- Apply favoritism based on who submitted
- Reject proposals for minor formatting issues if substance is present
- Reject proposals simply because they're brief, if they meet all criteria
- Require perfect template compliance—focus on whether required information is present

## Proposal to Evaluate

**Title:** ${title}

**Content:**
${proposal}

## Response Format

Respond with ONLY valid JSON in this exact structure:

{
  "complete": {
    "pass": boolean,
    "reason": "Factual observation listing what's present or missing. Format: 'Present: [list sections]. Missing: [list sections with specific elements missing, e.g., Budget & Resources table missing reporting plan].' For funding proposals, explicitly check: budget table with line items, total, source, reporting plan, milestones table with dates, team/accountability, and KPIs. For governance changes, check: technical specification, backwards compatibility, security considerations."
  },
  "legible": {
    "pass": boolean,
    "reason": "Factual statement of which elements are clear or unclear: (a) what will be done [yes/no + where found], (b) who will do it [yes/no/not applicable + where found], (c) why it should be approved [yes/no + where found], (d) what outcomes are expected [yes/no + where found]. Pass if all applicable elements are identifiable somewhere in the proposal."
  },
  "consistent": {
    "pass": boolean,
    "reason": "Factual observation of internal consistency. If inconsistent, cite the specific contradiction with section names and conflicting values (e.g., 'Abstract states $10k, Budget & Resources table shows $15k total'). If consistent, state: 'No internal contradictions found. [Key values] consistent throughout.'"
  },
  "genuine": {
    "pass": boolean,
    "reason": "Factual observation about NEAR ecosystem connection. State specifically which ecosystem area it addresses (protocol/governance/education/tools/infrastructure/events/community/research/public goods) and how. If not ecosystem-aligned, state specifically why (e.g., 'Exclusively benefits Ethereum with no NEAR integration mentioned')."
  },
  "compliant": {
    "pass": boolean,
    "reason": "Factual observation about standards adherence. Note any violations: unprofessional tone [cite example], spam/promotional content [cite], missing Copyright section, or code of conduct violations [specify]. If compliant, state: 'Follows community standards. Professional tone, Copyright section present.'"
  },
  "justified": {
    "pass": boolean,
    "reason": "Factual observation of logical coherence. Check: (1) Does Situation problem connect to Approach solution? (2) Is budget proportional to scope/timeline? (3) Do Mission outcomes follow from Approach activities? (4) Is timeline realistic for deliverables? If illogical, cite the specific disconnect with section references. If logical, state: 'Logical connections present: [problem]→[solution]→[outcome].'"
  },
  "alignment": {
    "score": "high" | "medium" | "low",
    "reason": "1-2 sentences explaining how this proposal advances NEAR's mission (decentralization, usability, ecosystem growth). High = directly advances core mission with clear impact. Medium = supports ecosystem but indirect/unclear impact. Low = tangential benefit or primarily benefits other ecosystems."
  },
  "overallPass": boolean,
  "summary": "3 sentences: (1) What this proposal aims to do in 1 sentence. (2) Screening result with primary reason for pass/fail. (3) If rejected, list the specific missing/problematic elements with template section names; if approved, note key strengths."
}

## Evaluation Examples

**Example 1 - Approved Funding Proposal:**
{
  "complete": {"pass": true, "reason": "Present: Abstract (3-sentence summary), Situation (tooling gap problem), Mission (objectives: build SDK, outcomes: 500 developers in 6 months), Approach (phased development strategy with risks), Milestones table (3 milestones with specific dates and deliverables), Budget & Resources table (5 line items totaling $50k, source: Treasury, monthly reporting plan), Team & Accountability (3 team members listed, accountable to House of Stake), discussions-to forum link. All required funding proposal sections complete."},
  "legible": {"pass": true, "reason": "(a) What: Build NEAR JavaScript SDK with documentation - clear in Abstract and Approach sections. (b) Who: Development team of 3 named in Team & Accountability section. (c) Why: Current lack of JS tooling prevents developer onboarding - clear in Situation section. (d) Outcomes: 500+ developers using SDK, 50+ projects built - specified in Mission outcomes. All four elements clearly identifiable."},
  "consistent": {"pass": true, "reason": "No internal contradictions found. $50k total consistent in Abstract, Approach, and Budget & Resources table. 6-month timeline consistent between Mission and Milestones (June-November dates). Team size of 3 consistent throughout. Deliverables in Milestones match activities described in Approach."},
  "genuine": {"pass": true, "reason": "Addresses NEAR developer ecosystem infrastructure. SDK development directly supports developer onboarding and tooling—core ecosystem development area. Clear NEAR-specific implementation (NEAR RPC integration, NEAR account model support)."},
  "compliant": {"pass": true, "reason": "Follows community standards. Professional tone throughout. Copyright section present with CC0 waiver. No promotional content. Follows template structure with all standard sections included."},
  "justified": {"pass": true, "reason": "Logical connections present: Tooling gap in Situation→build JS SDK in Approach→increased developers in Mission outcomes. Budget of $50k justified by 6 months × 3 developers + infrastructure. Timeline realistic for described scope (phase 1: core SDK, phase 2: docs, phase 3: examples). Outcomes (500 devs) reasonable given NEAR's developer community size."},
  "alignment": {"score": "high", "reason": "Directly advances NEAR's usability mission by lowering barriers for JavaScript developers—the largest developer population. Clear ecosystem growth impact through improved developer experience and tooling."},
  "overallPass": true,
  "summary": "Proposes building JavaScript SDK to address documented tooling gap preventing developer onboarding. Passes all screening criteria with complete template sections: itemized budget, dated milestones, measurable KPIs (500 developers), identified team, and logical justification. Approved for community voting."
}

**Example 2 - Not Approved (Incomplete Funding Proposal):**
{
  "complete": {"pass": false, "reason": "Present: Abstract, Situation, Mission (objectives stated), Approach, discussions-to link. Missing/Incomplete: (1) Budget & Resources section shows only total '$100k from Treasury' with no itemized table breaking down costs—no line items, no per-milestone allocation, no justification for amount. (2) Milestones table present but Target Date column empty—no specific dates provided. (3) Mission section lists objectives but no measurable KPIs or success metrics. (4) Budget & Resources missing reporting plan—no statement of how progress will be reported. (5) Team & Accountability section states 'Community DAO' but no specific individual or organization identified as responsible for delivery."},
  "legible": {"pass": true, "reason": "(a) What: Educational program with 10 workshops - clear in Abstract and Approach. (b) Who: 'Community DAO' mentioned but specific individuals unclear - partially stated in Team & Accountability. (c) Why: Low NEAR awareness in target region - clear in Situation section. (d) Outcomes: Increased developer participation - stated generally in Mission but not specific. All elements present though some lack specificity."},
  "consistent": {"pass": true, "reason": "No internal contradictions found. $100k amount consistent in Abstract and Budget & Resources. Workshop count (10) consistent throughout. No conflicting information detected."},
  "genuine": {"pass": true, "reason": "Addresses NEAR education and community building in underserved geographic region. Education programs are legitimate ecosystem area supporting awareness and developer onboarding."},
  "compliant": {"pass": true, "reason": "Follows community standards. Professional tone, Copyright section present. No promotional or spam content. Template structure followed with section headers."},
  "justified": {"pass": true, "reason": "Logical connections present: Low awareness (Situation)→educational workshops (Approach)→increased participation (Mission). However, lack of specific metrics and timeline makes it difficult to verify if outcomes are realistic. Budget-to-scope relationship unclear without itemization."},
  "alignment": {"score": "medium", "reason": "Education supports ecosystem growth but proposal lacks specificity on how workshops create sustainable NEAR developer community versus one-time attendance. Geographic expansion valuable but impact pathway unclear."},
  "overallPass": false,
  "summary": "Proposes educational workshop program to increase NEAR awareness in target region. Fails screening due to missing critical funding proposal elements. To pass, must add: (1) Itemized budget table in Budget & Resources section showing cost breakdown per workshop and activity, (2) Specific target dates in Milestones table, (3) Measurable KPIs in Mission section (e.g., number of developers completing workshops, projects built post-workshop, GitHub activity), (4) Reporting plan in Budget & Resources (monthly/quarterly updates), (5) Specific individual/organization names in Team & Accountability section."
}

**Example 3 - Approved Constitutional Proposal:**
{
  "complete": {"pass": true, "reason": "Present: Abstract (summary of voting period change), Situation (insufficient review time problem), Mission (objectives: improve vote quality, outcomes: better-informed decisions), Approach (extend period strategy with transition plan), Technical Specification (detailed: change voting_period parameter from 7 to 14 days in governance contract, specific function and parameter identified), Backwards Compatibility (assessment: no breaking changes, pending votes complete on old schedule), Milestones (implementation steps with dates), Security Considerations (analysis: longer voting window reduces rushed decisions, no new attack vectors), discussions-to forum link, Copyright section. All constitutional proposal sections complete."},
  "legible": {"pass": true, "reason": "(a) What: Change voting period from 7 to 14 days - clear in Abstract and Technical Specification. (b) Who: Not applicable for protocol parameter change, House of Stake governance to implement - noted in Approach. (c) Why: Current 7-day period insufficient for thorough community review - clear in Situation with examples. (d) Outcomes: Higher quality votes, increased participation - specified in Mission. All applicable elements clear."},
  "consistent": {"pass": true, "reason": "No internal contradictions found. Voting period change (7→14 days) stated consistently in Abstract, Technical Specification, and throughout. Implementation timeline (next voting cycle) consistent in Approach and Milestones. No conflicting parameters or dates."},
  "genuine": {"pass": true, "reason": "Addresses NEAR governance process improvement. Voting parameter optimization is core governance area that directly affects decision quality and community participation in House of Stake."},
  "compliant": {"pass": true, "reason": "Follows community standards. Professional analytical tone. Copyright section present. Constitutional proposal type correctly identified. All required governance sections included."},
  "justified": {"pass": true, "reason": "Logical connections present: Insufficient review time causing rushed votes (Situation)→extend voting period (Technical Specification)→better-informed decisions (Mission outcomes). Rationale supported by analysis of 3 recent votes where community requested more time. Timeline realistic (takes effect next cycle, no emergency changes). Security considerations properly address no new risks introduced."},
  "alignment": {"score": "high", "reason": "Directly improves NEAR's governance quality and decentralization by enabling more thoughtful community participation. Addresses practical barrier to effective governance identified by community."},
  "overallPass": true,
  "summary": "Proposes extending House of Stake voting period from 7 to 14 days to improve decision quality. Passes all screening criteria with complete constitutional proposal sections: detailed technical specification of parameter change, backwards compatibility assessment, security considerations, and logical justification based on recent governance experience. Approved for community voting."
}

**Example 4 - Not Approved (Not Genuine):**
{
  "complete": {"pass": true, "reason": "Present: Abstract, Situation, Mission, Approach, Milestones table with dates, Budget & Resources table ($75k itemized, source: Treasury, monthly reporting), Team & Accountability (marketing agency identified), discussions-to link. All required funding proposal sections present with appropriate detail."},
  "legible": {"pass": true, "reason": "(a) What: Marketing campaign for XYZ Swap DeFi protocol - clear in Abstract. (b) Who: ABC Marketing Agency - named in Team & Accountability. (c) Why: Increase XYZ Swap usage - stated in Situation. (d) Outcomes: 10k users, $5M TVL - specified in Mission. All four elements clearly identifiable."},
  "consistent": {"pass": true, "reason": "No internal contradictions found. $75k total consistent throughout. 6-month timeline consistent between Approach and Milestones. Target metrics consistent in Mission and Approach."},
  "genuine": {"pass": false, "reason": "Not NEAR ecosystem-aligned. Proposal exclusively promotes 'XYZ Swap,' an Ethereum-based DeFi protocol, with all activities (social media, influencer marketing, conference sponsorships) focused on Ethereum community. No NEAR integration mentioned—no NEAR bridge, no NEAR wallet support, no NEAR chain deployment, no educational content about NEAR DeFi. Abstract states 'increase Ethereum DeFi adoption' with zero reference to NEAR benefits. Treasury funds would exclusively benefit competing blockchain ecosystem."},
  "compliant": {"pass": true, "reason": "Follows community standards. Professional format, follows template structure, Copyright section present. No code of conduct violations in tone or content."},
  "justified": {"pass": true, "reason": "Logical connections present within its own scope: low awareness (Situation)→marketing campaign (Approach)→increased users (Mission). Budget reasonable for described marketing activities. However, logic doesn't extend to NEAR ecosystem benefit."},
  "alignment": {"score": "low", "reason": "No alignment with NEAR ecosystem. Proposal benefits Ethereum DeFi protocol with no NEAR integration, bridge, cross-chain functionality, or ecosystem spillover effects described."},
  "overallPass": false,
  "summary": "Proposes marketing campaign for Ethereum-based DeFi protocol 'XYZ Swap.' Fails genuine criterion—not ecosystem-aligned as proposal exclusively benefits competing blockchain with zero NEAR integration or ecosystem benefit mentioned. To pass screening, must demonstrate clear NEAR ecosystem benefit such as: NEAR chain deployment of XYZ Swap, bridge integration enabling NEAR user access, educational content comparing NEAR and Ethereum DeFi with NEAR advantages, or cross-chain functionality bringing users to NEAR ecosystem."
}

**Example 5 - Not Approved (Multiple Failures):**
{
  "complete": {"pass": true, "reason": "Present: Abstract, Situation, Mission, Approach, Milestones table, Budget & Resources table ($50k itemized, source, reporting plan), Team & Accountability, discussions-to link. All required sections present."},
  "legible": {"pass": true, "reason": "(a) What: Developer tool for smart contract testing - clear in Abstract. (b) Who: 2-person team named in Team & Accountability. (c) Why: Testing gap for NEAR developers - stated in Situation. (d) Outcomes: 300 developers using tool - in Mission. All elements clear."},
  "consistent": {"pass": false, "reason": "Multiple contradictions: (1) Budget inconsistency: Abstract states 'minimal funding request of $5k,' Situation says 'can be accomplished with $15k budget,' but Budget & Resources table shows total of $50k—three different amounts with no explanation. (2) Timeline contradiction: Abstract describes '2-week quick build,' Approach mentions '3-month development,' Milestones table spans 9 months (March-November)—three different timelines. (3) Scope contradiction: Situation claims 'simple tool,' Technical Specification describes 'complex multi-phase architecture with advanced features.'"},
  "genuine": {"pass": true, "reason": "Addresses NEAR developer tooling and smart contract testing infrastructure—legitimate ecosystem area supporting developer experience."},
  "compliant": {"pass": true, "reason": "Follows community standards. Professional tone, template structure followed, Copyright section present."},
  "justified": {"pass": false, "reason": "Logical contradictions: (1) Situation describes 'simple 2-week project' but Milestones show 9-month complex development with multiple phases—scope and timeline don't match stated simplicity. (2) Budget justification contradictory: claims 'minimal costs' and 'simple build' but requests $50k for year-long timeline suggesting complex project. (3) Team size inconsistent with scope: 2-person team for claimed '2-week simple tool' makes sense, but not for actual 9-month multi-phase complex system described in Technical Specification."},
  "alignment": {"score": "high", "reason": "Developer tooling directly supports NEAR ecosystem growth by improving smart contract development experience and reducing bugs."},
  "overallPass": false,
  "summary": "Proposes smart contract testing tool for NEAR developers. Fails screening due to critical inconsistencies and logical contradictions across sections. Must resolve: (1) Budget consistency—reconcile $5k (Abstract) vs $15k (Situation) vs $50k (Budget & Resources table) into single consistent amount with explanation for any changes, (2) Timeline consistency—reconcile '2-week' (Abstract) vs '3-month' (Approach) vs '9-month' (Milestones) into realistic single timeline throughout all sections, (3) Scope consistency—reconcile 'simple tool' (Situation) vs 'complex multi-phase architecture' (Technical Specification) with consistent complexity description, (4) Logical justification—align team size, budget, and timeline with actual scope: either simplify to match '2-week simple tool' narrative or expand narrative to match 9-month complex reality."
}

**Example 6 - Not Approved (Illegible):**
{
  "complete": {"pass": true, "reason": "Present: All template sections exist including Abstract, Situation, Mission, Approach, Milestones, Budget & Resources, Team & Accountability, discussions-to link. Sections are populated with text."},
  "legible": {"pass": false, "reason": "(a) What: Abstract states 'implement the paradigm shift infrastructure' but Approach section contains vague terms like 'synergistic frameworks' and 'quantum optimization vectors' without explaining actual deliverables—what will be built is unintelligible. (b) Who: Team & Accountability lists 'Digital Collective' with no individual names or verifiable organization. (c) Why: Situation section states 'need for revolutionary transformation' but doesn't explain specific problem—why this is needed is unclear. (d) Outcomes: Mission outcomes list 'enhanced parametric throughput' and 'elevated ontological positioning' but these are meaningless jargon—expected outcomes cannot be understood. Text is filled with buzzwords but lacks concrete meaning."},
  "consistent": {"pass": true, "reason": "Cannot assess consistency meaningfully when core content is unintelligible, but no obvious numerical contradictions in the vague text present."},
  "genuine": {"pass": false, "reason": "Cannot determine ecosystem alignment when proposal content is unintelligible. Mentions 'blockchain' and 'NEAR' but provides no comprehensible description of what would actually be built or how it relates to NEAR ecosystem."},
  "compliant": {"pass": true, "reason": "Template structure followed, professional tone maintained (though content is nonsensical), Copyright section present. No offensive content."},
  "justified": {"pass": false, "reason": "Cannot assess logical justification when problem, solution, and outcomes are all stated in meaningless jargon. No comprehensible cause-effect relationship can be identified."},
  "alignment": {"score": "low", "reason": "Cannot assess alignment when proposal is unintelligible. Generic blockchain buzzwords present but no specific NEAR ecosystem connection describable."},
  "overallPass": false,
  "summary": "Proposal contains all template sections but text is unintelligible jargon. Fails legible criterion—cannot identify what will be built ('paradigm shift infrastructure,' 'synergistic frameworks' are meaningless without concrete explanation), why it's needed (no specific problem stated), or what outcomes mean ('enhanced parametric throughput' is undefined jargon). To pass screening, must rewrite with concrete language: specify exact technical deliverables (e.g., 'build API for X' not 'synergistic framework'), explain specific problem (e.g., 'developers cannot do Y' not 'need transformation'), and define measurable outcomes (e.g., '100 developers using tool' not 'elevated positioning')."
}

## Now Evaluate

Carefully evaluate the proposal above against each criterion.

**Step 1:** Identify proposal type from content:
- Is this a funding request? (Look for budget/resources needed)
- Is this a governance/constitutional change? (Look for parameter/process changes)
- Is this operational/non-funding? (Look for actions without budget)

**Step 2:** Check completeness based on type:
- List which template sections are present
- List which required sections are missing or incomplete for this type
- Note if sections exist but lack required elements (e.g., table without dates)

**Step 3:** Evaluate remaining five criteria:
- Provide specific factual observations with section references
- Quote contradictions or missing elements
- Be precise about what passes or fails and where

**Step 4:** Determine overall pass/fail:
- Must pass ALL six criteria to pass overall
- List all failing criteria if multiple failures

**Step 5:** Write constructive summary:
- Sentence 1: What the proposal aims to do
- Sentence 2: Pass/fail with primary reason
- Sentence 3: If fail, specific improvements needed with section names; if pass, key strengths

Be specific, cite template sections by exact name, and provide actionable feedback.

Return your evaluation in valid JSON format only—no additional text before or after the JSON.`;

  try {
    const response = await fetch(
      "https://cloud-api.near.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-oss-120b",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`NEAR AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluation: Evaluation = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ evaluation });
    } else {
      throw new Error("Could not parse evaluation response");
    }
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to evaluate proposal" });
  }
}
