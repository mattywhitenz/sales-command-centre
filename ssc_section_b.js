
// ── Quota helper functions ─────────────────────────────────────────────────────
function _covColor(cov){if(cov<2)return "RED";if(cov<3)return "AMBER";return "GREEN";}
function _covClass(cov){if(cov<2)return "red";if(cov<3)return "amb";return "grn";}
function _liveCoverage(aeName){
  var pipe=PIPE_Q1.filter(function(d){return d.ae===aeName;}).reduce(function(s,d){return s+(d.nnacv||0);},0);
  var quota=_getQuota(aeName);
  if(!quota)return 0;
  return Math.round(pipe/quota*10)/10;
}

// ── Quota modal ───────────────────────────────────────────────────────────────
function openQuotaModal(){
  var body=document.getElementById("quota-body");
  if(!body)return;
  var html="";
  html+="<div style=\"display:grid;grid-template-columns:1fr 160px 110px;gap:0;padding:8px 16px 6px;border-bottom:1px solid var(--border)\">";
  html+="<div style=\"font-size:10px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px\">AE / Territory</div>";
  html+="<div style=\"font-size:10px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;text-align:right;padding-right:12px\">Quota (USD)</div>";
  html+="<div style=\"font-size:10px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;text-align:center\">Coverage</div>";
  html+="</div>";
  var sorted=AE_DATA.slice().sort(function(a,b){return a.n<b.n?-1:1;});
  sorted.forEach(function(ae){
    var quota=_getQuota(ae.n);
    var cov=_liveCoverage(ae.n);
    var cc=_covClass(cov);
    var aeId=ae.n.replace(/[^a-zA-Z0-9]/g,"_");
    html+="<div style=\"display:grid;grid-template-columns:1fr 160px 110px;gap:0;align-items:center;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.04)\">";
    html+="<div style=\"display:flex;align-items:center;gap:10px\">";
    var initials=(ae.init||ae.n.split(" ").map(function(p){return p[0];}).join("").substring(0,2)).toUpperCase();
    html+="<div style=\"width:32px;height:32px;border-radius:50%;background:var(--dark-teal);color:var(--wasabi);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center\">"+initials+"</div>";
    html+="<div><div style=\"font-size:13px;font-weight:700;color:var(--off-white)\">"+ae.n+"</div>";
    html+="<div style=\"font-size:10px;color:var(--mid);font-family:var(--mono);margin-top:1px\">"+(ae.terr||"")+"</div></div>";
    html+="</div>";
    html+="<div style=\"text-align:right;padding-right:12px\"><div style=\"display:flex;align-items:center;justify-content:flex-end;gap:4px\">";
    html+="<span style=\"font-size:12px;color:var(--mid);font-weight:600\">$</span>";
    html+="<input class=\"quota-input\" type=\"number\" min=\"0\" step=\"50000\" id=\"quota-input-"+aeId+"\" data-ae=\""+ae.n.replace(/"/g,"&quot;")+"\" value=\""+quota+"\" onchange=\"updateQuotaPreview(this)\" style=\"width:110px;text-align:right\"/>";
    html+="</div></div>";
    html+="<div style=\"text-align:center\"><div class=\"quota-coverage "+cc+"\" id=\"quota-cov-"+aeId+"\">"+cov.toFixed(1)+"×</div></div>";
    html+="</div>";
  });
  body.innerHTML=html;
  document.getElementById("quotaOverlay").classList.add("open");
  document.getElementById("quota-saved-msg").textContent="";
}
function closeQuotaModal(){document.getElementById("quotaOverlay").classList.remove("open");}
function updateQuotaPreview(input){
  var aeName=input.getAttribute("data-ae")||"";
  var newQuota=parseInt(input.value)||0;
  var pipe=PIPE_Q1.filter(function(d){return d.ae===aeName;}).reduce(function(s,d){return s+(d.nnacv||0);},0);
  var cov=newQuota>0?Math.round(pipe/newQuota*10)/10:0;
  var cc=_covClass(cov);
  var covEl=document.getElementById("quota-cov-"+aeName.replace(/[^a-zA-Z0-9]/g,"_"));
  if(covEl){covEl.textContent=cov.toFixed(1)+"×";covEl.className="quota-coverage "+cc;}
}
function saveQuotas(){
  AE_DATA.forEach(function(ae){
    var inputId="quota-input-"+ae.n.replace(/[^a-zA-Z0-9]/g,"_");
    var el=document.getElementById(inputId);
    if(el){var v=parseInt(el.value);if(!isNaN(v)&&v>=0)QUOTA_MAP[ae.n]=v;}
  });
  try{localStorage.setItem("sn_scc_quotas_"+(_QTR_META.q1Label||"CQ").replace(/\s/g,"_"),JSON.stringify(QUOTA_MAP));}catch(e){}
  AE_DATA.forEach(function(ae){
    var quota=_getQuota(ae.n);
    var pipe=PIPE_Q1.filter(function(d){return d.ae===ae.n;}).reduce(function(s,d){return s+(d.nnacv||0);},0);
    var cov=quota>0?Math.round(pipe/quota*10)/10:0;
    ae.coverage=cov;ae.covColor=_covColor(cov);
    if(pipe<=0)ae.risk="R";else if(cov<2)ae.risk="A";else ae.risk="G";
    ae.covReason=ae.n+" has "+_fmt(Math.round(pipe))+" pipeline against "+_fmt(quota)+" quota. Coverage: "+cov+"×.";
  });
  renderAE();
  var msg=document.getElementById("quota-saved-msg");
  if(msg){msg.textContent="✅ Saved & applied";msg.style.color="var(--wasabi)";}
  setTimeout(function(){closeQuotaModal();},900);
}
function resetQuotas(){
  QUOTA_MAP=JSON.parse(JSON.stringify(QUOTA_DEFAULTS));
  try{localStorage.removeItem("sn_scc_quotas_"+(_QTR_META.q1Label||"CQ").replace(/\s/g,"_"));}catch(e){}
  openQuotaModal();
}

// ── Dynamics CRM URL ──────────────────────────────────────────────────────────
function _crm(num){return "https://servicenow.crm.dynamics.com/main.aspx?appid=f2198fab-74c7-4b03-a193-ccc4056161dc&forceUCI=1&pagetype=search&searchText="+encodeURIComponent(num||"");}

// ── Format ────────────────────────────────────────────────────────────────────
function _fmt(n){
  if(n===null||n===undefined||isNaN(n))return "$0";
  var a=Math.abs(n),s=n<0?"-":"";
  if(a>=1000000)return s+"$"+(a/1000000).toFixed(1)+"M";
  if(a>=1000)return s+"$"+Math.round(a/1000)+"K";
  return s+"$"+a.toFixed(0);
}

// ── Stage helpers ─────────────────────────────────────────────────────────────
function _stageClass(s){
  var n=parseInt((s||"").match(/^(\d+)/)?.[1]||"0");
  return n>=6?"stage-commit":n>=5?"stage-expect":n>=4?"stage-upside":"stage-pipeline";
}
function _stageWidth(p){return Math.max(8,Math.min(60,Math.round((p||0)*0.6)));}

// ── NOWSELL METADATA — canonical (DIS/TV/BC/MP/COM/LPO) ──────────────────────
// v16.7: Added owner, ownerNote, managerAsk fields per NowSell v5 RACI governance.
// TV owner = SC (Accountable). All other milestones = AE (Accountable).
// managerAsk field drives the coaching modal direction — SC-owned milestones
// direct the manager to ask the SC, not the AE.
var NOWSELL_META={
  DIS:{label:"Discovery",owner:"AE",ownerNote:"AE is Accountable. SC and SSE are Involved.",
    desc:"Has the AE completed a Discovery engagement in Dynamics with BANT documented and a Champion identified?",
    g:"Discovery engagement marked Complete. Champion identified, BANT documented.",
    a:"Discovery engagement open but incomplete. BANT partially documented.",
    r:"No Discovery engagement. Deal is not qualified.",
    probes:["Who is the champion — not just a coach — and have we confirmed their authority?","Is BANT documented: Budget, Authority, Need, Timing?","Has the Discovery engagement been marked Complete (Green) in Dynamics?"],
    crm:["Open Discovery engagement in Dynamics → Engagements tab","Document BANT and Champion in engagement notes","Mark Complete once Champion confirmed and BANT documented"],
    action:"Open Discovery engagement in Dynamics. Document Champion and BANT. Mark Complete.",
    managerAsk:"Ask AE: Who is the confirmed Champion? Is BANT fully documented in the Discovery engagement?"},
  TV:{label:"Technical Validation",owner:"SC",ownerNote:"SC is Accountable per NowSell v5. AE supports but does NOT lead this milestone.",
    desc:"Has the SC opened a Technical Win engagement in Dynamics and is validation actively underway?",
    g:"Technical Win engagement marked Complete by SC. Customer technical team has accepted the solution.",
    a:"Technical Win engagement Open/In Progress — SC is actively running demo, POC, or technical review.",
    r:"No Technical Win engagement in Dynamics. SC has not started validation.",
    probes:["Has the SC opened a Technical Win engagement in Dynamics (Engagement Type: Technical Win)?","What is the SC's current validation approach — demo, POC, or workshop?","Has the customer's technical team formally accepted the solution yet?","Are all technical objections documented and resolved in the engagement?"],
    crm:["SC: Open Dynamics CRM → Opportunity → Engagements tab → '+ New Engagement' → type 'Technical Win'","SC: Log demo or POC date, attendees, and outcome in engagement description","SC: Set status to 'In Progress' until customer technical team confirms acceptance","SC: Attach POC results or technical feedback document to the engagement","SC: Mark engagement Complete once technical buyer has accepted — required before Stage 4b progression"],
    action:"SC to open or update Technical Win engagement in Dynamics. AE to confirm SC is actively engaged and demo/POC is scheduled.",
    managerAsk:"Ask SC (not AE): What is the current status of the Technical Win engagement in Dynamics? What is the validation approach and what does 'complete' look like for this customer?"},
  BC:{label:"Business Case",owner:"AE",ownerNote:"AE is Accountable. SSE is Involved. Value Melody Coach is the AI skill for BVA creation.",
    desc:"Has a Business Case or BVA been presented to and accepted by the Economic Buyer?",
    g:"Business Case engagement Complete. Economic Buyer has accepted the ROI narrative.",
    a:"Business Case presented but EB acceptance pending or outstanding objections.",
    r:"No Business Case. Economic Buyer has not been engaged on value.",
    probes:["Has the Economic Buyer been identified and engaged?","Has a BVA or ROI model been presented?","Is the Business Case engagement marked Complete in Dynamics?"],
    crm:["Create Business Case engagement in Dynamics","Upload BVA/ROI document to engagement","Mark Complete once EB provides written or verbal acceptance"],
    action:"Build and present Business Case to Economic Buyer. Confirm acceptance. Mark Complete.",
    managerAsk:"Ask AE: Has the Economic Buyer seen and responded to the Business Case? What is the EB's reaction to the ROI model?"},
  MP:{label:"Mutual Plan",owner:"AE",ownerNote:"AE is Accountable. Draft at Stage 4a; keep live until signed at Stage 6.",
    desc:"Is there a signed or agreed Mutual Success Plan in place with clear milestones and owner accountability?",
    g:"Mutual Plan agreed, documented, and tracked in Dynamics or shared file.",
    a:"Mutual Plan drafted but not formally agreed or missing key milestones.",
    r:"No Mutual Plan exists. No joint accountability on deal progression.",
    probes:["Is there a Mutual Success Plan agreed with this customer?","What are the key milestones and who owns each step?","Is the Mutual Plan referenced in Dynamics?"],
    crm:["Create Mutual Plan engagement in Dynamics","Link Mutual Plan document to opportunity record","Track milestone completion dates against plan"],
    action:"Build and agree a Mutual Success Plan. Reference in Dynamics. Track milestone completion.",
    managerAsk:"Ask AE: Has the customer champion agreed to the Mutual Plan? Are all milestones documented and is the plan uploaded to Dynamics?"},
  COM:{label:"Commercial",owner:"AE",ownerNote:"AE is Accountable. SC and SSE are Involved.",
    desc:"Has the commercial proposal been presented and is pricing agreed in principle with the Economic Buyer?",
    g:"Commercial proposal presented and accepted in principle. Pricing agreed.",
    a:"Commercial proposal submitted but under negotiation or not yet accepted.",
    r:"No commercial discussion has occurred. Pricing not yet presented.",
    probes:["Has the commercial proposal been presented?","Has the Economic Buyer indicated acceptance of pricing?","Is the Commercial engagement marked Complete in Dynamics?"],
    crm:["Create Commercial engagement in Dynamics","Upload proposal document","Mark Complete when EB accepts pricing in principle"],
    action:"Present commercial proposal to Economic Buyer. Confirm pricing acceptance. Mark Complete.",
    managerAsk:"Ask AE: Has the EB seen and responded to the commercial proposal? Is pricing agreed in principle or is there an active objection?"},
  LPO:{label:"Legal and PO",owner:"AE",ownerNote:"AE is Accountable. Order Form submitted via SURF. Legal and Procurement engaged.",
    desc:"Is the Order Form submitted to SURF and are Legal and Procurement engaged on timeline to PO?",
    g:"Order Form in SURF. Legal and Procurement engaged. PO timeline confirmed.",
    a:"Order Form submitted but Legal or Procurement not yet engaged or timeline unclear.",
    r:"Order Form not in SURF. No Legal or Procurement engagement initiated.",
    probes:["Has the Order Form been submitted to SURF?","Are Legal and Procurement engaged and is there a PO timeline?","Is the Legal/PO engagement marked Complete in Dynamics?"],
    crm:["Submit Order Form to SURF immediately","Create Legal and PO engagement in Dynamics","Track Procurement contact and PO expected date"],
    action:"Submit Order Form to SURF. Engage Legal and Procurement. Confirm PO timeline.",
    managerAsk:"Ask AE: Is the Order Form in SURF? Who is the Procurement contact and what is the PO timeline?"}
};

var MKEYS=["DIS","TV","BC","MP","COM","LPO"];

var MANAGER_COACH={
  DIS:{g:"Discovery is solid. Ask the AE to confirm Champion is still engaged and BANT remains current — things change.",
       a:"Ask AE: What is the specific gap in Discovery? Who is the Champion and have you confirmed their authority? Coach to complete by end of this week.",
       r:"Critical: No Discovery means this deal is not qualified. Ask AE to open Discovery engagement in Dynamics today and identify Champion within 5 business days."},
  TV:{g:"Tech Validation complete. Confirm SC has no outstanding technical objections and customer technical team is fully aligned. Check SC notes in Dynamics engagement.",
      a:"⚠️ SC-owned milestone. Ask SC (not AE): What is the current validation approach — demo, POC, or workshop? What is outstanding before the Technical Win engagement can be marked Complete?",
      r:"🚨 SC-owned milestone. No Technical Win engagement exists. Ask SC to open Dynamics → Engagements → '+ New Engagement' → type 'Technical Win' today. Deals at Stage 4a without active Technical Validation rarely close."},
  BC:{g:"Business Case accepted. Confirm the EB remembers the value — schedule a refresh call if close date is more than 30 days away.",
      a:"Ask AE: What is the EB feedback on the Business Case? Identify objection and address. Coach to use Value Melody to strengthen ROI narrative.",
      r:"No Business Case. Ask AE: Has the EB been engaged? If not, book EB introduction this week. Deals without a Business Case are at serious risk."},
  MP:{g:"Mutual Plan in place. Review milestones with AE and confirm customer is meeting their commitments on schedule.",
      a:"Ask AE: What milestone is at risk in the Mutual Plan? Identify blockers and agree remediation steps. Confirm customer sponsor is engaged.",
      r:"No Mutual Plan. Ask AE to draft a Mutual Success Plan with the customer this week. Include 3–5 milestones with dates and owners."},
  COM:{g:"Commercial accepted. Confirm pricing is locked and no further renegotiation is expected. Check for last-minute procurement challenges.",
       a:"Ask AE: What is the commercial objection? Is it price or scope? Coach on concession trade-offs. Escalate to manager if >10% discount request.",
       r:"No commercial discussion. Ask AE: Has the EB seen pricing? If not, present this week. Late-stage deals with no commercial engagement are high risk."},
  LPO:{g:"Order Form in SURF. Ask AE to confirm PO date with Procurement. Check Legal review timeline — chase if >5 days without response.",
       a:"Ask AE: What is the blocker in Legal or Procurement? Identify contact and timeline. Offer to escalate if needed. Order Form must be in SURF now.",
       r:"Order Form not submitted. RED flag for any deal in Stage 5 or higher. Ask AE to submit Order Form to SURF today without exception."}
};

// ── NOWSELL STAGE MAP ─────────────────────────────────────────────────────────
var NOWSELL_MAP=[
  {stage:1,code:"1-Opp", label:"Opportunity",cat:"Pre-Pipeline",req_open:[],          req_closed:[]},
  {stage:2,code:"2-Disc",label:"Discovery",  cat:"Pipeline",   req_open:["DIS"],       req_closed:[]},
  {stage:3,code:"3-Qual",label:"Qualify",    cat:"Pipeline",   req_open:[],            req_closed:["DIS"]},
  {stage:4,code:"4a-Val",label:"Validate",   cat:"Upside",     req_open:["TV","MP"],   req_closed:[]},
  {stage:5,code:"4b-Prop",label:"Propose",   cat:"Upside",     req_open:["BC"],        req_closed:["TV"]},
  {stage:6,code:"5-Neg", label:"Negotiate",  cat:"Expect",     req_open:["COM"],       req_closed:["BC"]},
  {stage:7,code:"6-Comm",label:"Commit",     cat:"Commit",     req_open:["LPO"],       req_closed:["MP"]},
  {stage:8,code:"7-Won", label:"Close Won",  cat:"Closed",     req_open:[],            req_closed:["LPO"]}
];
var CAT_PROB={"Pre-Pipeline":[0,5],"Pipeline":[5,20],"Upside":[15,50],"Expect":[40,70],"Commit":[60,95],"Closed":[90,100]};

function _getNowsellStageMap(stageStr){
  var s=(stageStr||"").toLowerCase();
  var m=s.match(/^(\d+[ab]?)\s*[-\u2013]/);
  if(m){
    var n=m[1];
    if(n==="8"||n==="7"||s.indexOf("close won")>=0||s.indexOf("closed won")>=0)return NOWSELL_MAP[7];
    if(n==="6")return NOWSELL_MAP[6];
    if(n==="5")return NOWSELL_MAP[5];
    if(n==="4b")return NOWSELL_MAP[4];
    if(n==="4a"||n==="4")return NOWSELL_MAP[3];
    if(n==="3")return NOWSELL_MAP[2];
    if(n==="2")return NOWSELL_MAP[1];
    if(n==="1")return NOWSELL_MAP[0];
  }
  if(s.indexOf("close won")>=0||s.indexOf("closed won")>=0)return NOWSELL_MAP[7];
  if(s.indexOf("commit")>=0||s.indexOf("imminent")>=0)return NOWSELL_MAP[6];
  if(s.indexOf("validation compl")>=0||s.indexOf("negotiat")>=0)return NOWSELL_MAP[5];
  if(s.indexOf("propose")>=0||s.indexOf("present solution")>=0)return NOWSELL_MAP[4];
  if(s.indexOf("validat")>=0||s.indexOf("economic buyer")>=0)return NOWSELL_MAP[3];
  if(s.indexOf("qualify")>=0||s.indexOf("qual")>=0||s.indexOf("objectives")>=0)return NOWSELL_MAP[2];
  if(s.indexOf("discovery")>=0||s.indexOf("disc")>=0)return NOWSELL_MAP[1];
  return NOWSELL_MAP[0];
}

function _nowsellScore(d){
  // v16.7: Engagement-first scoring — checks d.engagements (from Call 1f) before stage inference.
  // Open engagement = amber (not red). Complete = green. No engagement = stage inference.
  var eng=d.engagements||{};
  function _engScore(mk){
    var e=eng[mk];
    if(!e)return null;           // no engagement record → fall through to inference
    return e.status||"a";       // "g", "a", or "r" mapped in Call 1f parser
  }

  var sm=_getNowsellStageMap(d.stage);
  var p=parseFloat(d.prob)||0;
  var cat=sm?sm.cat:"";

  // Build inferred scores first
  var inferred;
  if(cat==="Closed"||cat==="Commit"||(p>=70)){inferred={DIS:"g",TV:"g",BC:"g",MP:"g",COM:"g",LPO:p<95?"a":"g"};}
  else if(cat==="Expect"||(p>=40)){inferred={DIS:"g",TV:"g",BC:"g",MP:"a",COM:"r",LPO:"r"};}
  else if(cat==="Upside"&&sm.stage>=5||(p>=20)){inferred={DIS:"g",TV:"a",BC:"r",MP:"r",COM:"r",LPO:"r"};}
  else if(cat==="Upside"||(p>=10)){inferred={DIS:"a",TV:"r",BC:"r",MP:"r",COM:"r",LPO:"r"};}
  else{inferred={DIS:"r",TV:"r",BC:"r",MP:"r",COM:"r",LPO:"r"};}

  // Override with engagement-backed scores where available
  // NNR #45: engagement score always wins over inference for DIS, TV, BC, MP
  return {
    DIS:_engScore("DIS")||inferred.DIS,
    TV: _engScore("TV") ||inferred.TV,
    BC: _engScore("BC") ||inferred.BC,
    MP: _engScore("MP") ||inferred.MP,
    COM:inferred.COM,   // no Dynamics engagement type maps to COM — always inferred
    LPO:inferred.LPO    // no Dynamics engagement type maps to LPO — always inferred
  };
}

function _getForecastCheck(d){
  var sm=_getNowsellStageMap(d.stage);
  var p=parseFloat(d.prob)||0;
  var pr=sm?CAT_PROB[sm.cat]:[0,100];
  var probMismatch=sm&&!(pr[0]<=p&&p<=pr[1]);
  var ns=d.nowsell||d._ns||_nowsellScore(d);
  var missingOpen=(sm&&sm.req_open||[]).filter(function(mk){return (ns[mk]||"r")==="r";});
  var missingClosed=(sm&&sm.req_closed||[]).filter(function(mk){return (ns[mk]||"r")!=="g";});
  // allNonGreen: ALL milestones that are red or amber — drives badge colour consistency
  var allNonGreen=MKEYS.filter(function(mk){return (ns[mk]||"r")!=="g";});
  var allOk=!probMismatch&&!allNonGreen.length;
  // Score: use allNonGreen for consistency with badge colours shown on pipeline row
  var score="ok";
  if(allNonGreen.length>0){
    var hasRed=MKEYS.some(function(mk){return (ns[mk]||"r")==="r";});
    if(probMismatch)score="both";
    else if(hasRed)score="gap";    // red milestones = gap (matches red badge styling)
    else score="warn";             // amber only = warn (matches amber badge styling)
  } else if(probMismatch){
    score="warn";
  }
  return {sm:sm,probMismatch:probMismatch,probRange:pr,forecastCode:sm?sm.code:"?",
          missingOpen:missingOpen,missingClosed:missingClosed,
          allNonGreen:allNonGreen,allOk:allOk,score:score};
}

function _wtdForAE(aeName){
  return PIPE_Q1.filter(function(d){return d.ae===aeName&&(d.nnacv||0)>0;})
    .reduce(function(s,d){return s+Math.round((d.nnacv||0)*(d.prob||0)/100);},0);
}

// ── DYNAMICS_ACTIONS — per-milestone numbered CRM steps ───────────────────────
var DYNAMICS_ACTIONS={
  DIS:{
    r:["Open Dynamics CRM → Opportunity record → Engagements tab",
       "Click '+ New Engagement' → select type 'Discovery'",
       "Document Champion name, Budget, Authority, Need, Timeline (BANT) in the engagement notes",
       "Set engagement status to 'In Progress'",
       "Link the Champion contact record to the opportunity"],
    a:["Open Dynamics CRM → Opportunity → Engagements → find the Discovery engagement",
       "Review and complete any outstanding BANT fields in the engagement notes",
       "Confirm Champion contact is linked and set as Primary Contact on the opportunity",
       "Update engagement status to 'Complete' once all BANT is documented",
       "Verify Champion is active — if contact has changed, update the record"]
  },
  TV:{
    r:["SC: Open Dynamics CRM → Opportunity record → Engagements tab",
       "SC: Click '+ New Engagement' → select type 'Technical Win'",
       "SC: Log the demo or POC date, attendees, and technical outcome in the engagement description",
       "SC: Attach any POC results, workshop outputs, or technical feedback document to the engagement",
       "SC: Set status to 'In Progress' — do NOT mark Complete until customer technical team formally accepts"],
    a:["SC: Open Dynamics CRM → Opportunity → Engagements → find the Technical Win engagement",
       "SC: Add outstanding POC results, technical follow-up notes, or objection resolutions",
       "SC: Confirm all technical objections are documented and resolved in the engagement notes",
       "SC: Update engagement status to 'Complete' once technical buyer has accepted the solution",
       "SC: Attach confirmation note or email from customer technical lead to the engagement record"]
  },
  BC:{
    r:["Open Dynamics CRM → Opportunity record → Engagements tab",
       "Click '+ New Engagement' → select type 'Business Case'",
       "Upload the Business Value Assessment (BVA) or ROI document to the engagement",
       "Record the Economic Buyer name and scheduled presentation date in notes",
       "Set status to 'In Progress' — do not mark Complete until EB formally accepts"],
    a:["Open Dynamics CRM → Opportunity → Engagements → find Business Case engagement",
       "Add EB feedback and objection notes to the engagement description",
       "Attach revised BVA or updated ROI model if changes were made",
       "Update engagement status to 'Complete' once EB provides written or verbal acceptance",
       "Log the acceptance date and EB name in the engagement notes"]
  },
  MP:{
    r:["Open Dynamics CRM → Opportunity record → Engagements tab",
       "Click '+ New Engagement' → select type 'Mutual Plan'",
       "Add 3–5 milestone rows with dates and owners (customer and ServiceNow)",
       "Attach the Mutual Success Plan document (Word/PDF) to the engagement",
       "Set status to 'In Progress' and share the document with the customer champion"],
    a:["Open Dynamics CRM → Opportunity → Engagements → find Mutual Plan engagement",
       "Update milestone completion dates — mark any completed milestones as done",
       "Add notes on any at-risk milestones or customer delays",
       "Re-share updated Mutual Plan with customer champion if milestones have changed",
       "Update engagement status to 'Complete' once all milestones are agreed and customer-signed"]
  },
  COM:{
    r:["Open Dynamics CRM → Opportunity record → Engagements tab",
       "Click '+ New Engagement' → select type 'Commercial'",
       "Attach the commercial proposal or SOW to the engagement",
       "Log the proposal date and EB contact name in notes",
       "Set status to 'In Progress' — mark Complete only when EB accepts pricing in principle"],
    a:["Open Dynamics CRM → Opportunity → Engagements → find Commercial engagement",
       "Add negotiation notes and outstanding objections to the engagement description",
       "Attach the revised proposal if pricing has been updated",
       "Log any verbal or written acceptance from the EB with a date",
       "Update engagement status to 'Complete' once pricing is agreed in principle"]
  },
  LPO:{
    r:["Open Dynamics CRM → Opportunity record → navigate to the Order Form section",
       "Submit the Order Form through SURF (ServiceNow internal approval tool)",
       "Open Dynamics Engagements tab → '+ New Engagement' → select 'Legal and PO'",
       "Add Procurement contact name and Legal reviewer to the engagement",
       "Log the PO target date and any Legal review timeline in notes"],
    a:["Verify Order Form is submitted in SURF — if not, submit immediately",
       "Open Dynamics CRM → Opportunity → Engagements → find Legal and PO engagement",
       "Add Procurement contact, PO timeline, and any legal review notes",
       "Log any outstanding legal redlines or commercial blockers in the notes",
       "Update engagement status to 'Complete' once PO is received and Order Form is countersigned"]
  }
};

// ── Pipeline filter state ─────────────────────────────────────────────────────
var _pipeActiveFilter=null;
function _pipeFilter(score,mo){
  if(_pipeActiveFilter&&_pipeActiveFilter.score===score&&_pipeActiveFilter.mo===mo){
    _pipeActiveFilter=null;
  } else {
    _pipeActiveFilter={score:score,mo:mo||null};
  }
  renderPipe();
}
function _pipeFilterClear(){_pipeActiveFilter=null;renderPipe();}

// ── renderAtRisk — Deals at Risk This Week panel (above pipeline table) ───────
function renderAtRisk(){
  var panel=document.getElementById("risk-panel");
  var dealsEl=document.getElementById("risk-deals");
  var countEl=document.getElementById("risk-count");
  if(!panel||!dealsEl)return;
  var risks=typeof DEALS_AT_RISK!=="undefined"?DEALS_AT_RISK:[];
  // Also compute on-the-fly from PIPE_Q1 in case DSZ was not updated
  if(!risks.length){
    risks=PIPE_Q1.filter(function(d){
      return d.dtc>=0&&d.dtc<=21&&(d.prob||0)<60&&!d.nextSteps&&!d.notesSummary;
    }).sort(function(a,b){return (a.dtc||99)-(b.dtc||99);});
  }
  if(!risks.length){panel.style.display="none";return;}
  panel.style.display="block";
  if(countEl)countEl.textContent=risks.length+" deal"+(risks.length!==1?"s":"")+" closing within 21 days — low prob, no next steps";
  var html="";
  risks.forEach(function(d){
    var dtcLabel=d.dtc===0?"TODAY":d.dtc===1?"TOMORROW":d.dtc+"d";
    var dtcColor=d.dtc<=7?"var(--red)":"var(--amber)";
    html+="<div class=\"risk-deal-row\" onclick=\"openHygieneModal('"+d.num+"')\" style=\"cursor:pointer\">";
    html+="<div class=\"risk-deal-dtc\" style=\"color:"+dtcColor+"\">"+dtcLabel+"</div>";
    html+="<div class=\"risk-deal-name\">"+((d.name&&d.name!==d.num)?d.name:d.account)+"</div>";
    html+="<div class=\"risk-deal-ae\">"+d.ae+"</div>";
    html+="<div class=\"risk-deal-nnacv\">"+_fmt(d.nnacv)+"</div>";
    html+="<div class=\"risk-deal-tag\">"+d.prob+"% · no next steps</div>";
    html+="<a class=\"crm-a crm-btn act-btn\" href=\""+_crm(d.num)+"\" target=\"_blank\" onclick=\"event.stopPropagation()\" style=\"font-size:10px\">CRM ↗</a>";
    html+="</div>";
  });
  dealsEl.innerHTML=html;
}

// ── renderUnassigned — no-op stub (merged into renderPipe as first group) ─────
// ⚠️ PD #34: Unassigned rows render INSIDE tbody-pipe as the first group,
// using an amber group header. This ensures pixel-perfect column alignment with
// assigned rows — same table, same colgroup, same CSS, identical row structure.
// The unassigned-panel div is hidden; this stub is kept for REQUIRED_FUNCTIONS.
function renderUnassigned(){
  var panel=document.getElementById("unassigned-panel");
  if(panel)panel.style.display="none";
}
// ── copyCoachBrief — copy AE coaching brief to clipboard ─────────────────────
function copyCoachBrief(aeName,btnEl){
  var ae=AE_DATA.filter(function(a){return a.n===aeName;})[0];
  if(!ae)return;
  var cqLabel=(_QTR_META&&_QTR_META.q1Label)||"CQ";
  var lines=[];
  lines.push("=== "+ae.n+" | "+cqLabel+" Coaching Brief ===");
  lines.push(ae.coachContext||ae.terr||"");
  lines.push("");
  lines.push("CONTEXT");
  lines.push(ae.coachNarrative||"No narrative available.");
  lines.push("");
  lines.push("COVERAGE: "+ae.coverage+"× | PIPELINE: "+_fmt(ae.pipe)+" | WON: "+_fmt(ae.won));
  if(ae.attainPct!=null)lines.push("PROJ ATTAINMENT: "+_fmt(ae.attainProj||0)+" ("+ae.attainPct+"% of quota "+_fmt(ae.quota||0)+")");
  lines.push("RISK: "+(ae.risk==="R"?"🔴 RED":ae.risk==="A"?"🟡 AMBER":"🟢 GREEN"));
  if(ae.actions&&ae.actions.length){
    lines.push("");
    lines.push("TOP COACHING ACTIONS");
    ae.actions.forEach(function(a,i){lines.push((i+1)+". "+a);});
  }
  // Competitive intelligence section
  var compDeals=PIPE_Q1.filter(function(d){return d.ae===aeName&&d.competitor&&d.competitor.trim();});
  if(compDeals.length){
    lines.push("");
    lines.push("COMPETITIVE DEALS ("+compDeals.length+")");
    compDeals.forEach(function(d){
      lines.push("  ⚔ "+(d.name||d.account)+" ("+_fmt(d.nnacv)+") — vs "+d.competitor);
    });
    lines.push("  → Request compete cards from Sales Success Centre for each competitor above.");
  }
  // Pipeline build plays section
  if(ae.pipeActions&&ae.pipeActions.length){
    lines.push("");
    lines.push("PIPELINE BUILD PLAYS");
    ae.pipeActions.forEach(function(p,i){lines.push((i+1)+". "+p);});
  }
  var _allD=(typeof UNASSIGNED_DEALS!=="undefined"?PIPE_Q1.concat(UNASSIGNED_DEALS):PIPE_Q1);
  var deals=_allD.filter(function(d){return d.ae===aeName;}).sort(function(a,b){return (b.nnacv||0)-(a.nnacv||0);});
  if(deals.length){
    lines.push("");
    lines.push("OPEN DEALS ("+deals.length+")");
    deals.forEach(function(d){
      lines.push("  • "+(d.name||d.account)+" | "+_fmt(d.nnacv)+" | "+d.stage+" | "+d.prob+"% | Close: "+d.closeDate);
    });
  }
  lines.push("");
  lines.push("Generated: "+new Date().toLocaleDateString()+" | ServiceNow Sales Command Centre");
  var text=lines.join("\n");
  try{
    navigator.clipboard.writeText(text).then(function(){
      if(btnEl){btnEl.textContent="✅ Copied!";btnEl.classList.add("copied");
        setTimeout(function(){btnEl.textContent="📋 Copy Brief";btnEl.classList.remove("copied");},2000);}
    });
  }catch(e){
    // Fallback for browsers without clipboard API
    var ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
    document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy");}catch(e2){}
    document.body.removeChild(ta);
    if(btnEl){btnEl.textContent="✅ Copied!";btnEl.classList.add("copied");
      setTimeout(function(){btnEl.textContent="📋 Copy Brief";btnEl.classList.remove("copied");},2000);}
  }
}

// ── draftEmailToAE — open pre-formatted coaching email in mail client (Improvement 6) ──
// Builds a mailto: URI with subject and body pre-populated from the AE's coaching card.
// The manager clicks "✉ Email AE" on any coaching card and their mail client opens
// with the coaching brief pre-filled — ready to send or edit before sending.
function draftEmailToAE(aeName,btnEl){
  var ae=AE_DATA.filter(function(a){return a.n===aeName;})[0];
  if(!ae)return;
  var cqLabel=(_QTR_META&&_QTR_META.q1Label)||"CQ";
  var firstName=aeName.split(" ")[0];
  var subject=encodeURIComponent(cqLabel+" Pipeline Check-In — "+firstName);
  var bodyLines=[];
  bodyLines.push("Hi "+firstName+",");
  bodyLines.push("");
  bodyLines.push("Just a quick "+cqLabel+" pipeline check-in based on the latest data:");
  bodyLines.push("");
  bodyLines.push("PIPELINE: "+_fmt(ae.pipe)+" | COVERAGE: "+ae.coverage+"× | WON: "+_fmt(ae.won));
  if(ae.attainPct!=null)bodyLines.push("PROJECTED ATTAINMENT: "+ae.attainPct+"% ("+_fmt(ae.attainProj||0)+")");
  bodyLines.push("");
  bodyLines.push("KEY PRIORITIES THIS WEEK");
  if(ae.actions&&ae.actions.length){
    ae.actions.forEach(function(a,i){bodyLines.push((i+1)+". "+a);});
  } else {
    bodyLines.push("1. Confirm next steps on top deals");
    bodyLines.push("2. Update NowSell milestones in Dynamics");
  }
  bodyLines.push("");
  var deals=PIPE_Q1.filter(function(d){return d.ae===aeName;}).sort(function(a,b){return (b.nnacv||0)-(a.nnacv||0);}).slice(0,3);
  if(deals.length){
    bodyLines.push("TOP DEALS — QUICK STATUS");
    deals.forEach(function(d){
      bodyLines.push("  • "+(d.name||d.account)+" | "+_fmt(d.nnacv)+" | "+d.prob+"% | Close: "+d.closeDate);
    });
    bodyLines.push("");
  }
  bodyLines.push("Happy to discuss in our next 1:1 — let me know if you want to talk through any of the above.");
  bodyLines.push("");
  bodyLines.push("Thanks,");
  var body=encodeURIComponent(bodyLines.join("\n"));
  window.open("mailto:?subject="+subject+"&body="+body,"_blank");
  if(btnEl){
    var orig=btnEl.textContent;
    btnEl.textContent="✅ Opened!";
    setTimeout(function(){btnEl.textContent=orig;},2000);
  }
}

// ── renderPipe — renders assigned + unassigned rows in one unified table ──────
// ⚠️ PD #34: Unassigned deals render as the FIRST group in tbody-pipe with an
// amber "⚠ Unassigned Deals" group header — same tbody, same colgroup, same CSS.
// This is the ONLY correct approach for column alignment. A separate table or div
// layout will always misalign columns and is a deploy quality fail.
// ⚠️ PD #33: Section title uses total pipeline including unassigned deals.
function renderPipe(){
  var tbody=document.getElementById("tbody-pipe");
  if(!tbody)return;
  var ua=typeof UNASSIGNED_DEALS!=="undefined"?UNASSIGNED_DEALS:[];
  var uPanel=document.getElementById("unassigned-panel");
  if(uPanel)uPanel.style.display="none";
  // ⚠️ NNR #60: Merge PIPE_Q1 + UNASSIGNED_DEALS into one sorted list by closeDate.
  // Unassigned deals render INLINE within each month group — AE column shows amber ⚠ Unassigned.
  // The previous separate-block pattern (unassigned first, then month groups) is RETIRED.
  var allRows=PIPE_Q1.concat(ua).sort(function(a,b){
    if(a.closeDate!==b.closeDate)return a.closeDate<b.closeDate?-1:1;
    return (b.nnacv||0)-(a.nnacv||0);
  });
  if(!allRows.length){
    tbody.innerHTML="<tr><td colspan=\"9\" style=\"text-align:center;color:var(--mid);padding:24px\">No open pipeline deals this quarter.</td></tr>";
    return;
  }
  var MONTH_NAMES={"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec"};
  var html="";

  // ── GROUP ALL DEALS (assigned + unassigned) BY CLOSE MONTH ─────────────────
  var monthGroups={};var monthOrder=[];
  allRows.forEach(function(d){
    var mo=d.closeDate?d.closeDate.substring(0,7):"9999-99";
    if(!monthGroups[mo]){monthGroups[mo]=[];monthOrder.push(mo);}
    monthGroups[mo].push(d);
  });
  monthOrder.forEach(function(mo){monthGroups[mo].sort(function(a,b){return (b.nnacv||0)-(a.nnacv||0);});});
  monthOrder.forEach(function(mo){
    var deals=monthGroups[mo];
    var moParts=mo.split("-");
    var moLabel=moParts.length===2?(MONTH_NAMES[moParts[1]]||moParts[1])+" "+moParts[0]:mo;
    var moNet=deals.reduce(function(s,d){return s+(d.nnacv||0);},0);
    var moNetColor=moNet<0?"var(--red)":"var(--wasabi)";
    var gapCount=0;var riskCount=0;var unassignedCount=0;
    deals.forEach(function(d){
      var fc=d._fc||_getForecastCheck(d);
      if(fc.score==="both")riskCount++;
      else if(fc.score==="gap"||fc.score==="warn")gapCount++;
      if(d.ae==="Unassigned"||!d.ae)unassignedCount++;
    });
    html+="<tr class=\"month-group-hdr\">"
      +"<td colspan=\"9\" style=\"padding:10px 14px;background:linear-gradient(90deg,var(--dark-teal),var(--inf-blue));border-top:2px solid rgba(99,223,78,.2);border-bottom:1px solid var(--border)\">"
      +"<div style=\"display:flex;align-items:center;gap:14px;flex-wrap:wrap\">"
      +"<span style=\"font-size:12px;font-weight:700;color:var(--wasabi);letter-spacing:.5px\">"+moLabel+"</span>"
      +"<span style=\"font-size:12px;font-weight:700;color:"+moNetColor+"\">"+_fmt(moNet)+" net</span>"
      +"<span style=\"font-size:11px;color:var(--mid)\">"+deals.length+" deal"+(deals.length!==1?"s":"")+"</span>"
      +(unassignedCount?"<span style=\"font-size:11px;color:var(--amber)\">⚠ "+unassignedCount+" unassigned</span>":"")
      +(riskCount?"<button onclick=\"_pipeFilter('both','"+mo+"')\" style=\"font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(232,57,77,.15);color:var(--red);font-weight:700;border:1px solid rgba(232,57,77,.35);cursor:pointer\">⚠ "+riskCount+" Risk</button>":"")
      +(gapCount?"<button onclick=\"_pipeFilter('gap','"+mo+"')\" style=\"font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(245,166,35,.12);color:var(--amber);font-weight:700;border:1px solid rgba(245,166,35,.3);cursor:pointer\">△ "+gapCount+" Gap</button>":"")
      +"</div></td></tr>";
    var filteredDeals=(_pipeActiveFilter&&_pipeActiveFilter.mo===mo)?deals.filter(function(d){var fc2=d._fc||_getForecastCheck(d);return _pipeActiveFilter.score==="both"?fc2.score==="both":fc2.score==="gap"||fc2.score==="warn";}):deals;
    filteredDeals.forEach(function(d){
      var ns=d._ns||_nowsellScore(d); d._ns=ns;
      var fc=d._fc||_getForecastCheck(d);d._fc=fc;
      var nc=(d.nnacv||0)<0?"nnacv-neg":(d.nnacv||0)===0?"nnacv-zero":"nnacv-pos";
      var ds=(d.nnacv||0)<0?" <span class=\"dsell-flag\">▼DS</span>":"";
      var isUnassigned=(d.ae==="Unassigned"||!d.ae);
      var aeCell=isUnassigned
        ?"<td style=\"font-weight:600;color:var(--amber);font-size:11px\">⚠ Unassigned</td>"
        :"<td style=\"font-weight:600;color:var(--wasabi);font-size:12px\">"+d.ae+"</td>";
      var dtcBadge="";
      if(typeof d.dtc==="number"){
        var dtcColor=d.dtc<=7?"var(--red)":d.dtc<=14?"var(--amber)":"var(--wasabi)";
        var dtcLabel=d.dtc<=0?"OVERDUE":d.dtc+"d";
        dtcBadge=" <button onclick=\"event.stopPropagation();showDtcExplainer(this,"+d.dtc+",'"+d.closeDate+"')\""
          +" style=\"font-size:9px;padding:2px 6px;border-radius:3px;background:rgba(0,0,0,.3);color:"+dtcColor+";font-weight:700;border:1px solid "+dtcColor+";cursor:pointer\">"+dtcLabel+"</button>";
      }
      var nsCells="";
      MKEYS.forEach(function(mk){
        var mv=ns[mk]||"r";
        nsCells+="<span class=\"ns-badge mc "+mv+"\" onclick=\"event.stopPropagation();openHygieneModal('"+d.num+"','ns')\" title=\""+mk+" — click to coach\">"+mk+"</span>";
      });
      var fcClass="fcast-ok",fcLabel="✓ Clean";
      if(fc.score==="both"){fcClass="fcast-both";fcLabel="⚠ Risk";}
      else if(fc.score==="warn"){fcClass="fcast-warn";fcLabel="~ Prob";}
      else if(fc.score==="gap"){fcClass="fcast-gap";fcLabel="△ Gap";}
      var dealTitle=(d.name&&d.name!==d.account&&d.name!==d.num)?d.name:d.account;
      var rowBg=fc.score==="both"?"rgba(232,57,77,.03)":fc.score==="gap"||fc.score==="warn"?"rgba(245,166,35,.02)":(isUnassigned?"rgba(245,166,35,.01)":"");
      html+="<tr onclick=\"openHygieneModal('"+d.num+"')\" style=\"cursor:pointer"+(rowBg?";background:"+rowBg:"")+"\">"
        +aeCell
        +"<td><div style=\"font-weight:600;font-size:12px\">"+dealTitle+"</div>"
        +(d.name&&d.name!==d.account&&d.name!==d.num?"<div style=\"font-size:10px;color:var(--mid);font-style:italic\">"+d.account+"</div>":"")
        +"<div style=\"font-family:var(--mono);font-size:9px;color:var(--mid)\">"+d.num+"</div></td>"
        +"<td><span style=\"font-size:11px\">"+d.stage+"</span>"
        +(d.dis!=null&&d.dis>0?"<span style=\"font-size:9px;color:"+(d.dis>30?"var(--red)":d.dis>14?"var(--amber)":"var(--mid)")+";margin-left:5px;font-family:var(--mono)\" title=\"Days in current stage\">"+d.dis+"d in stage</span>":"")
        +"<span class=\"stage-bar "+_stageClass(d.stage)+"\" style=\"width:"+_stageWidth(d.prob)+"px\"></span></td>"
        +"<td><span class=\"prob-chip\" style=\"background:rgba(99,223,78,.1);color:var(--wasabi)\">"+d.prob+"%</span></td>"
        +"<td class=\""+nc+"\">"+_fmt(d.nnacv)+ds+"</td>"
        +"<td style=\"font-family:var(--mono);font-size:11px;color:var(--mid)\">"+d.closeDate+dtcBadge+"</td>"
        +"<td><div class=\"ae-deal-ns-row\">"+nsCells+"</div></td>"
        +"<td><button class=\"fcast-badge "+fcClass+"\" style=\"cursor:pointer;background:transparent;border:1px solid currentColor\" onclick=\"event.stopPropagation();_hgModal('"+d.num+"')\">"+fcLabel+"</button></td>"
        +"<td style=\"white-space:nowrap\">"
        +"<button onclick=\"event.stopPropagation();openModal('"+d.num+"','coach')\" style=\"padding:3px 8px;font-size:10px;font-weight:700;border:1px solid #7bcfe8;background:rgba(123,207,232,.1);color:#7bcfe8;border-radius:4px;cursor:pointer;margin-right:4px\" title=\"Manager Coaching\">👔 Coach</button>"
        +"<a class=\"crm-a crm-btn act-btn\" href=\""+_crm(d.num)+"\" target=\"_blank\" onclick=\"event.stopPropagation()\">CRM ↗</a>"
        +"</td></tr>";
    });
  });
  tbody.innerHTML=html;
  var clearBanner=document.getElementById("pipe-filter-banner");
  if(!clearBanner){
    clearBanner=document.createElement("div");
    clearBanner.id="pipe-filter-banner";
    clearBanner.style.cssText="margin-bottom:10px;padding:8px 14px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;gap:10px;font-size:12px";
    var tbl=document.getElementById("tbl-pipe");
    if(tbl&&tbl.parentNode)tbl.parentNode.insertBefore(clearBanner,tbl);
  }
  if(_pipeActiveFilter){
    clearBanner.style.display="flex";
    clearBanner.innerHTML="<span style='color:var(--mid)'>Filtering: </span><strong style='color:var(--wasabi)'>"+(_pipeActiveFilter.score==="both"?"⚠ Risk deals":"△ Gap deals")+" in "+_pipeActiveFilter.mo+"</strong><button onclick='_pipeFilterClear()' style='margin-left:auto;padding:2px 10px;font-size:11px;background:transparent;border:1px solid var(--border);color:var(--mid);border-radius:4px;cursor:pointer'>✕ Clear filter</button>";
  } else {
    clearBanner.style.display="none";
  }
  // ⚠️ PD #33 + NNR #60: totalNet and totalDeals from merged allRows (assigned + unassigned)
  var totalNet=allRows.reduce(function(s,d){return s+(d.nnacv||0);},0);
  var totalDeals=allRows.length;
  var titleEl=document.getElementById("pipe-section-title");
  if(titleEl)titleEl.textContent=(_QTR_META.q1Label||"CQ")+" Open Pipeline — "+totalDeals+" Deals · Net "+_fmt(totalNet)+" · Grouped by Close Month";
}

// ── renderWon + renderClosedLost ──────────────────────────────────────────────
function renderWon(){
  var tbody=document.getElementById("tbody-won");
  var footerRow=document.getElementById("won-footer-row");
  var titleEl=document.getElementById("won-section-title");
  var sWon=document.getElementById("s-won");
  var sWonSub=document.getElementById("s-won-sub");
  var cqLabel=(_QTR_META.q1Label)||"CQ";
  if(!tbody)return;
  if(!WON_CQ||!WON_CQ.length){
    tbody.innerHTML="<tr><td colspan=\"7\" style=\"text-align:center;color:var(--mid);padding:18px\">No closed deals this quarter yet.</td></tr>";
    if(titleEl)titleEl.textContent=cqLabel+" Closed Won — 0 Deals · $0 Net NNACV";
    if(sWon){sWon.textContent="$0";sWon.className="sc-val a";}
    if(sWonSub)sWonSub.textContent="0 deals · "+cqLabel;
  } else {
    var totalWon=WON_CQ.reduce(function(a,d){return a+(d.nnacv||0);},0);
    var html="";
    WON_CQ.forEach(function(d){
      var nc=(d.nnacv||0)<0?"nnacv-neg":"nnacv-pos";
      var ds=(d.nnacv||0)<0?" <span class=\"dsell-flag\">▼DS</span>":"";
      var dealTitle=(d.name&&d.name!==d.account&&d.name!==d.num)?d.name:d.account;
      html+="<tr><td><span style=\"font-family:var(--mono);font-size:11px;color:var(--mid)\">"+d.num+"</span></td>"
        +"<td><div style=\"font-weight:600;font-size:12px\">"+dealTitle+"</div></td>"
        +"<td style=\"font-size:11px\">"+d.account+"</td>"
        +"<td style=\"font-weight:600;color:var(--wasabi);font-size:12px\">"+d.ae+"</td>"
        +"<td style=\"font-family:var(--mono);font-size:10px;color:var(--mid)\">"+d.terr+"</td>"
        +"<td class=\""+nc+"\">"+_fmt(d.nnacv)+ds+"</td>"
        +"<td style=\"font-family:var(--mono);font-size:11px;color:var(--mid)\">"+d.closeDate+"</td></tr>";
    });
    tbody.innerHTML=html;
    if(footerRow){
      var ftColor=totalWon<0?"var(--red)":"var(--wasabi)";
      footerRow.innerHTML="<td colspan=\"5\" style=\"font-size:12px;font-weight:700;color:var(--wasabi);padding:10px 12px\">Total Closed Won Net NNACV</td>"
        +"<td style=\"font-size:14px;font-weight:700;color:"+ftColor+";padding:10px 12px\">"+_fmt(totalWon)+"</td><td></td>";
    }
    if(sWon){sWon.textContent=_fmt(totalWon);sWon.className="sc-val"+(totalWon<0?" a":"");}
    if(sWonSub)sWonSub.textContent=WON_CQ.length+" deal"+(WON_CQ.length!==1?"s":"")+" · "+cqLabel;
    if(titleEl)titleEl.textContent=cqLabel+" Closed Won — "+WON_CQ.length+" Deal"+(WON_CQ.length!==1?"s":"")+" · "+_fmt(totalWon)+" Net NNACV";
  }
  // Render Closed Lost section
  var clSection=document.getElementById("cl-section");
  var clTbody=document.getElementById("tbody-cl");
  var clFooter=document.getElementById("cl-footer-row");
  var clTitle=document.getElementById("cl-section-title");
  if(CLOSED_LOST&&CLOSED_LOST.length&&clSection&&clTbody){
    clSection.style.display="block";
    var clTotal=CLOSED_LOST.reduce(function(a,d){return a+(d.nnacv||0);},0);
    var clHtml="";
    CLOSED_LOST.forEach(function(d){
      clHtml+="<tr><td><span style=\"font-family:var(--mono);font-size:11px;color:var(--mid)\">"+d.num+"</span></td>"
        +"<td><div style=\"font-weight:600;font-size:12px;color:var(--red)\">"+((d.name&&d.name!==d.account&&d.name!==d.num)?d.name:d.account)+"</div></td>"
        +"<td style=\"font-size:11px\">"+d.account+"</td>"
        +"<td style=\"font-weight:600;color:var(--wasabi);font-size:12px\">"+d.ae+"</td>"
        +"<td style=\"font-family:var(--mono);font-size:10px;color:var(--mid)\">"+d.terr+"</td>"
        +"<td class=\"nnacv-neg\">"+_fmt(d.nnacv)+" <span class=\"dsell-flag\">▼LOST</span></td>"
        +"<td style=\"font-family:var(--mono);font-size:11px;color:var(--mid)\">"+d.closeDate+"</td></tr>";
    });
    clTbody.innerHTML=clHtml;
    if(clFooter)clFooter.innerHTML="<td colspan=\"5\" style=\"font-size:12px;font-weight:700;color:var(--red);padding:10px 12px\">Total Closed Lost Net NNACV</td>"
      +"<td style=\"font-size:14px;font-weight:700;color:var(--red);padding:10px 12px\">"+_fmt(clTotal)+"</td><td></td>";
    if(clTitle)clTitle.textContent="⚠ Closed Lost Downsells — "+CLOSED_LOST.length+" Deal"+(CLOSED_LOST.length!==1?"s":"")+" · "+_fmt(clTotal);
  }
  // Update Closed Won header badge
  var totalNet=WON_CQ.reduce(function(a,d){return a+(d.nnacv||0);},0)
    +(CLOSED_LOST||[]).reduce(function(a,d){return a+(d.nnacv||0);},0);
  var hdrWon=document.getElementById("hdr-won");
  if(hdrWon){hdrWon.textContent=_fmt(totalNet)+" Net Won CQ";hdrWon.className="bdg "+(totalNet<0?"red":"grn");}
}

// ── renderAE ──────────────────────────────────────────────────────────────────
function renderAE(){
  var grid=document.getElementById("ae-grid");
  if(!grid)return;
  if(!AE_DATA||!AE_DATA.length){grid.innerHTML="<div style=\"color:var(--mid);font-size:12px;padding:16px\">No AE data available.</div>";return;}
  AE_DATA.forEach(function(ae){
    if(ae.dsTotal===undefined||ae.dsTotal===null){
      ae.dsTotal=PIPE_Q1.filter(function(d){return d.ae===ae.n&&(d.nnacv||0)<0;}).reduce(function(s,d){return s+(d.nnacv||0);},0);
    }
  });
  var sorted=AE_DATA.slice().sort(function(a,b){return (b.won||0)-(a.won||0);});
  var html="";
  sorted.forEach(function(ae,rank){
    var riskColor=ae.risk==="R"?"var(--red)":ae.risk==="A"?"var(--amber)":"var(--wasabi)";
    var initials=(ae.init||(ae.n||"AE").split(" ").map(function(p){return p[0];}).join("").substring(0,2)).toUpperCase();
    var covCls=ae.covColor==="RED"?"red":ae.covColor==="AMBER"?"amb":"grn";
    var paceCls=ae.paceColor==="RED"?"red":ae.paceColor==="AMBER"?"amb":"grn";
    var ragCls=ae.risk==="R"?"red":ae.risk==="A"?"amb":"grn";
    var ragLabel=ae.risk==="R"?"🔴 RED":ae.risk==="A"?"🟡 AMBER":"🟢 GREEN";
    var safeAeName=ae.n.replace(/'/g,"\\'").replace(/"/g,"&quot;");  // ← NNR #46: required for email/copy buttons
    var ds=ae.dsTotal||0;
    html+="<div class=\"ae-card\" style=\"border-color:"+(ae.risk==="R"?"rgba(232,57,77,.4)":ae.risk==="A"?"rgba(245,166,35,.3)":"var(--border)")+"\" onclick=\"openAEModal("+rank+")\">";
    html+="<div class=\"ae-top\">";
    html+="<div class=\"ae-avatar\" style=\"background:"+(ae.risk==="R"?"rgba(232,57,77,.25)":ae.risk==="A"?"rgba(245,166,35,.2)":"var(--dark-teal)")+";color:"+riskColor+"\">"+initials+"</div>";
    html+="<div style=\"flex:1\"><div class=\"ae-name\">"+ae.n+"</div><div class=\"ae-terr\">"+(ae.terr||"")+"</div></div>";
    html+="</div>";
    html+="<div class=\"ae-stats\">";
    html+="<div class=\"ae-stat\"><div class=\"ae-stat-val "+(ae.won<0?"a":"")+"\">"+_fmt(ae.won)+"</div><div class=\"ae-stat-lbl\">Won</div></div>";
    html+="<div class=\"ae-stat\"><div class=\"ae-stat-val\">"+_fmt(ae.pipe)+"</div><div class=\"ae-stat-lbl\">Pipeline</div></div>";
    html+="<div class=\"ae-stat\" title=\"Weighted pipeline = positive deals × stage probability\"><div class=\"ae-stat-val\">"+_fmt(_wtdForAE(ae.n))+"</div><div class=\"ae-stat-lbl\">Wtd Pipe</div></div>";
    html+="</div>";
    if(ds<0){
      html+="<div class=\"ae-ds-tile\" onclick=\"event.stopPropagation()\">";
      html+="<div><div class=\"ae-ds-label\">⚠ Downsell</div><div class=\"ae-ds-val\">"+_fmt(ds)+"</div></div>";
      html+="<div class=\"ae-ds-note\">Open pipeline includes net-negative downsell exposure</div>";
      html+="</div>";
    }
    html+="<div style=\"display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px\">";
    var liveCov=_liveCoverage(ae.n);var liveCovCls=liveCov<2?"red":liveCov<3?"amb":"grn";
    html+="<button class=\"ae-badge-btn "+liveCovCls+"\" onclick=\"event.stopPropagation();openBadgeCoach('cov',"+rank+")\" title=\"Coverage coaching\">"+liveCov.toFixed(1)+"× cov ▶</button>";
    if(ae.pacingPct!=null){
      html+="<button class=\"ae-badge-btn "+paceCls+"\" onclick=\"event.stopPropagation();openBadgeCoach('pace',"+rank+")\" title=\"Pacing coaching\">"+ae.pacingPct+"% pacing ▶</button>";
    } else {
      // Quarter not started — show pre-Q state badge (teal, neutral)
      html+="<button class=\"ae-badge-btn\" style=\"background:rgba(4,67,85,.5);color:#7bcfe8;border-color:rgba(123,207,232,.4)\" onclick=\"event.stopPropagation();openBadgeCoach('pace',"+rank+")\" title=\"Pacing coaching\">Q opens soon ▶</button>";
    }
    html+="<button class=\"ae-badge-btn "+ragCls+"\" onclick=\"event.stopPropagation();openBadgeCoach('rag',"+rank+")\" title=\"Risk coaching\">"+ragLabel+" ▶</button>";
    html+="</div>";
    // ── Build Pipeline button — prominent on RED/AMBER coverage AEs ───────────
    // Pipeline generation coaching is the most important action for under-covered AEs.
    // Surfaced directly on the stack card so it's impossible to miss.
    if(ae.covColor==="RED"||ae.covColor==="AMBER"){
      html+="<div style=\"margin-bottom:9px\">";
      var pipeBorderColor=ae.covColor==="RED"?"rgba(232,57,77,.5)":"rgba(245,166,35,.4)";
      var pipeBg=ae.covColor==="RED"?"rgba(232,57,77,.1)":"rgba(245,166,35,.08)";
      var pipeTextColor=ae.covColor==="RED"?"var(--red)":"var(--amber)";
      var pipeLabel=ae.covColor==="RED"?"🏗 Pipeline Generation — ACTION REQUIRED":"🏗 Pipeline Generation — Sourcing Plays";
      html+="<button onclick=\"event.stopPropagation();openBadgeCoach('pipe',"+rank+")\" style=\"width:100%;padding:8px 12px;background:"+pipeBg+";border:1.5px solid "+pipeBorderColor+";color:"+pipeTextColor+";border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;text-align:left;display:flex;align-items:center;justify-content:space-between;letter-spacing:.2px\">"+pipeLabel+"<span style=\"font-size:10px;opacity:.8\">"+( ae.pipeActions?ae.pipeActions.length:0)+" plays ▶</span></button>";
      html+="</div>";
    }
    // Coaching narrative — deal-specific context paragraph (matches Coaching tab depth)
    if(ae.coachNarrative){
      html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.55;padding:8px 10px;background:rgba(0,0,0,.15);border-radius:6px;border-left:2px solid rgba(255,255,255,.07)\">"+(ae.coachNarrative||"")+"</div>";
    } else {
      html+="<div style=\"font-size:11px;color:var(--mid);line-height:1.4\">"+(ae.lever||"")+"</div>";
    }
    html+="</div>";
  });
  grid.innerHTML=html;
}

// ── renderCoach ───────────────────────────────────────────────────────────────
function renderCoach(){
  var grid=document.getElementById("coach-grid");
  if(!grid)return;
  var cqLabel=(_QTR_META.q1Label)||"CQ";
  if(!AE_DATA||!AE_DATA.length){grid.innerHTML="<div style=\"color:var(--mid);font-size:12px;padding:16px\">No AE data available.</div>";return;}
  var sorted=AE_DATA.slice().sort(function(a,b){return (b.pipe||0)-(a.pipe||0);});
  var html="";
  sorted.forEach(function(ae){
    var riskColor=ae.risk==="R"?"var(--red)":ae.risk==="A"?"var(--amber)":"var(--wasabi)";
    var covCls=(ae.covColor==="RED"||ae.covColor==="red")?"red":(ae.covColor==="AMBER"||ae.covColor==="amb")?"amb":"grn";
    var safeAeName=ae.n.replace(/'/g,"\\'").replace(/"/g,"&quot;");

    // Detect competitive deals for this AE
    var compDeals=PIPE_Q1.filter(function(d){return d.ae===ae.n&&d.competitor&&d.competitor.trim();});
    var compNames=[];
    compDeals.forEach(function(d){if(compNames.indexOf(d.competitor)<0)compNames.push(d.competitor);});
    var hasComp=compNames.length>0;

    html+="<div class=\"coach-card\" style=\"border-left:3px solid "+riskColor+";background:var(--card-bg)\">";

    // ── Header row ─────────────────────────────────────────────────────────
    html+="<div style=\"display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;gap:12px\">";
    html+="<div>";
    html+="<div style=\"font-size:15px;font-weight:700;color:"+riskColor+"\">"+ae.n+"</div>";
    html+="<div style=\"font-size:10px;color:var(--mid);font-family:var(--mono);margin-top:2px\">"+(ae.coachContext||ae.terr||"")+"</div>";
    html+="</div>";
    html+="<div style=\"display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0\">";
    html+="<span class=\"bdg "+covCls+"\" style=\"font-size:10px\">"+ae.coverage+"× cov</span>";
    if(ae.won>0||ae.pipe>0){
      html+="<span style=\"font-size:10px;font-weight:600;padding:3px 8px;border-radius:10px;background:rgba(0,0,0,.2);color:var(--mid)\">"+_fmt(ae.won)+" won · "+_fmt(ae.pipe)+" pipe</span>";
    }
    if(ae.attainPct!=null){
      var attCls=ae.attainPct>=80?"grn":ae.attainPct>=50?"amb":"red";
      var attBg=ae.attainPct>=80?"rgba(99,223,78,.1)":ae.attainPct>=50?"rgba(245,166,35,.1)":"rgba(232,57,77,.1)";
      var attColor=ae.attainPct>=80?"var(--wasabi)":ae.attainPct>=50?"var(--amber)":"var(--red)";
      html+="<span style=\"font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px;background:"+attBg+";color:"+attColor+";border:1px solid currentColor\" title=\"Won + Weighted Pipeline vs Quota "+_fmt(ae.quota||0)+"\">📈 "+ae.attainPct+"% attain</span>";
    }
    if(hasComp){
      html+="<span style=\"font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px;background:rgba(232,57,77,.12);color:var(--red);border:1px solid rgba(232,57,77,.35)\" title=\"Competitive deals: "+compNames.join(", ")+"\">⚔ "+compDeals.length+" competitive</span>";
    }
    html+="<button class=\"copy-brief-btn\" onclick=\"event.stopPropagation();copyCoachBrief('"+safeAeName+"',this)\" title=\"Copy coaching brief\">📋 Copy Brief</button>";
    html+="<button class=\"copy-brief-btn\" onclick=\"event.stopPropagation();draftEmailToAE('"+safeAeName+"',this)\" title=\"Draft coaching email\" style=\"margin-left:6px;border-color:rgba(99,223,78,.4)\">✉ Email AE</button>";
    html+="</div></div>";

    // ── Coaching narrative ─────────────────────────────────────────────────
    if(ae.coachNarrative){
      html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.65;margin-bottom:12px;padding:10px 12px;background:rgba(0,0,0,.15);border-radius:6px;border-left:2px solid rgba(255,255,255,.06)\">"+ae.coachNarrative+"</div>";
    }

    // ── Competitive intelligence callout (only when competitor data present) ─
    if(hasComp){
      var COMPETE_GUIDE={
        "Salesforce":"Use the Salesforce compete card. Key angle: platform consolidation vs point solution sprawl. Engage Deal Desk for commercial leverage. Highlight Now Assist AI vs Agentforce limitations on non-CRM workflows.",
        "Microsoft": "Use the Microsoft compete card. Key angle: ServiceNow depth vs Copilot breadth. Differentiate on workflow intelligence, IT/HR/GRC scope, and governed AI agents. Avoid 'vs Teams' comparisons — focus on operational outcomes.",
        "Pega":      "Use the Pega compete card. Key angle: NowSell workflow depth vs Pega's BPM complexity. Highlight faster time-to-value, pre-built FSI solutions, and lower TCO. Push for a platform demo.",
        "Archer":    "Use the Archer compete card. Key angle: IRM/GRC native on the Now Platform vs Archer's standalone risk silo. Compliance automation and CPS230 positioning are strong differentiators.",
      };
      html+="<div style=\"margin-bottom:12px;padding:10px 12px;background:rgba(232,57,77,.07);border:1px solid rgba(232,57,77,.25);border-radius:6px\">";
      html+="<div style=\"font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px\">⚔ Competitive Intelligence</div>";
      compDeals.forEach(function(d){
        var guide=COMPETE_GUIDE[d.competitor]||("Request compete support card for "+d.competitor+" from Sales Success Centre.");
        html+="<div style=\"margin-bottom:8px;font-size:12px\">";
        html+="<span style=\"font-weight:600;color:var(--off-white)\">"+d.account.slice(0,32)+" ("+_fmt(d.nnacv)+") — vs "+d.competitor+":</span> ";
        html+="<span style=\"color:var(--mid)\">"+guide+"</span>";
        html+="</div>";
      });
      html+="</div>";
    }

    // ── Top Coaching Actions (deal-aware, milestone-specific) ──────────────
    var actList=ae.actions||[];
    if(actList.length){
      html+="<div style=\"font-size:10px;font-weight:700;color:var(--wasabi);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px\">Top Coaching Actions:</div>";
      actList.forEach(function(a){
        var isCompete=a.indexOf("⚔")===0;
        var aColor=isCompete?"color:var(--red)":"";
        html+="<div class=\"coach-action-item\" style=\"margin-bottom:5px;font-size:12px;"+aColor+"\">"+a+"</div>";
      });
    }

    // ── NNR #59: Deal Trend Pills (per-deal health since last run) ─────────
    // Only renders when DEAL_TRENDS is populated (not first run).
    // Each deal row gets a compact trend pill: 🟢 Improving / 🟡 Mixed / 🔴 Declining.
    // Clicking a pill opens the hygiene modal to show the full Health Since Last Run section.
    var _hasDT = typeof DEAL_TRENDS !== "undefined" && Object.keys(DEAL_TRENDS).length > 0;
    if(_hasDT){
      var _aDeals = PIPE_Q1.filter(function(d){return d.ae===ae.n;}).sort(function(a,b){return (b.nnacv||0)-(a.nnacv||0);});
      if(_aDeals.length){
        html+="<div style=\"margin-top:10px;margin-bottom:4px\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:#7bcfe8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px\">📈 Deal Health Trends:</div>";
        _aDeals.forEach(function(d){
          var _t = DEAL_TRENDS[d.num];
          if(!_t) return;
          // Compute pill classification
          var _pill = null;
          var _improving = (_t.prob_delta > 0) || (_t.stage_delta === "advanced");
          var _declining = (_t.prob_delta < 0) && (_t.stage_delta === "stalled" || _t.stage_delta === "regressed") && _t.ns_delta === "stale";
          var _neutral   = (_t.prob_delta === 0) && (_t.stage_delta === "unchanged" || _t.stage_delta === "stalled") && _t.ns_delta === "stale";
          var _isNew     = _t.stage_delta === "new";
          if(_isNew || _neutral) return; // skip unchanged/new deals — no pill
          if(_declining){
            _pill = {emoji:"🔴", label:"Declining", color:"rgba(232,57,77,.15)", border:"rgba(232,57,77,.4)", text:"var(--red)"};
          } else if(_improving){
            _pill = {emoji:"🟢", label:"Improving", color:"rgba(99,223,78,.1)", border:"rgba(99,223,78,.35)", text:"var(--wasabi)"};
          } else {
            _pill = {emoji:"🟡", label:"Mixed", color:"rgba(245,166,35,.1)", border:"rgba(245,166,35,.35)", text:"var(--amber)"};
          }
          if(!_pill) return;
          var _dName = (d.name && d.name !== d.num) ? d.name.slice(0,32) : d.account.slice(0,32);
          var _probStr = _t.prob_delta > 0 ? " +"+_t.prob_delta+"%" : _t.prob_delta < 0 ? " "+_t.prob_delta+"%" : "";
          var _stageStr = _t.stage_delta !== "unchanged" && _t.stage_delta !== "new" ? " · stage "+_t.stage_delta : "";
          var _nsStr    = _t.ns_delta === "fresh" ? " · next steps updated" : _t.ns_delta === "stale" ? " · next steps stale" : "";
          html+="<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:5px;cursor:pointer\" onclick=\"openHygieneModal('"+d.num+"')\">";
          html+="<span style=\"display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;background:"+_pill.color+";border:1px solid "+_pill.border+";color:"+_pill.text+"\">"+_pill.emoji+" "+_pill.label+"</span>";
          html+="<span style=\"font-size:11px;color:var(--off-white)\">"+_dName+"</span>";
          html+="<span style=\"font-size:10px;color:var(--mid)\">"+_fmt(d.nnacv)+_probStr+_stageStr+_nsStr+"</span>";
          html+="</div>";
        });
        html+="</div>";
      }
    }

    // ── Pipeline Build Plays (always shown — expands/collapses) ───────────
    var plays=ae.pipeActions||[];
    if(plays.length){
      var needsPipe=ae.covColor==="RED"||ae.covColor==="AMBER";
      var playBorderColor=needsPipe?"rgba(245,166,35,.4)":"rgba(99,223,78,.2)";
      var playHeaderColor=needsPipe?"var(--amber)":"var(--wasabi)";
      var playBg=needsPipe?"rgba(245,166,35,.05)":"rgba(99,223,78,.04)";
      var playLabel=needsPipe?"🏗 Pipeline Build — Sourcing Plays (PRIORITY)":"🏗 Pipeline Build — Sourcing Plays";
      var collapseId="pipe-plays-"+ae.n.replace(/\s+/g,"-");
      var openByDefault=needsPipe?"block":"none";
      html+="<div style=\"margin-top:10px;border:1px solid "+playBorderColor+";border-radius:6px;overflow:hidden\">";
      html+="<div onclick=\"var el=document.getElementById('"+collapseId+"');el.style.display=el.style.display==='none'?'block':'none'\" style=\"padding:8px 12px;background:"+playBg+";cursor:pointer;display:flex;justify-content:space-between;align-items:center\">";
      html+="<span style=\"font-size:10px;font-weight:700;color:"+playHeaderColor+";text-transform:uppercase;letter-spacing:.6px\">"+playLabel+"</span>";
      html+="<span style=\"font-size:10px;color:var(--mid)\">▾</span>";
      html+="</div>";
      html+="<div id=\""+collapseId+"\" style=\"display:"+openByDefault+";padding:10px 12px\">";
      plays.forEach(function(p,i){
        html+="<div style=\"margin-bottom:7px;font-size:12px;color:var(--off-white);padding-left:14px;position:relative\">";
        html+="<span style=\"position:absolute;left:0;color:"+playHeaderColor+";font-weight:700\">"+(i+1)+".</span>";
        html+=p;
        html+="</div>";
      });
      html+="</div></div>";
    }

    // ── Card footer: Copy Brief + Email AE ─────────────────────────────────────
    html+="<div style=\"display:flex;gap:6px;margin-top:8px;flex-wrap:wrap\">";
    html+="<button class=\"copy-brief-btn\" onclick=\"event.stopPropagation();copyCoachBrief('"+safeAeName+"',this)\" title=\"Copy coaching brief\">📋 Copy Brief</button>";
    html+="<button class=\"copy-brief-btn\" onclick=\"event.stopPropagation();draftEmailToAE('"+safeAeName+"',this)\" title=\"Draft coaching email to AE\" style=\"border-color:rgba(99,223,78,.4)\">✉ Email AE</button>";
    html+="</div>";

    html+="</div>"; // end coach-card
  });
  grid.innerHTML=html;
}

// ── renderHygiene (Forecast Hygiene inline on pipeline tab) ───────────────────
function renderHygiene(){
  // Hygiene is inline in the pipeline table — no separate section needed
  // This function is retained for the 24-function check gate
}

// ── renderTerrSummary — Territory Health Bar (5-second manager read) ──────────
// Improvement 4: Compact one-line bar above stat cards showing territory-level
// pipeline, coverage, projected attainment, won CQ, top deal, and risk AEs.
function renderTerrSummary(){
  var bar=document.getElementById("terr-bar");
  if(!bar)return;
  var ts=typeof TERR_SUMMARY!=="undefined"?TERR_SUMMARY:null;
  if(!ts||(ts.nnacv==null&&ts.totalPipe==null))return;
  var _tsNnacv=ts.nnacv!=null?ts.nnacv:ts.totalPipe;
  bar.style.display="flex";
  var tbPipe=document.getElementById("tb-pipe");
  var tbCov=document.getElementById("tb-cov");
  var tbAttain=document.getElementById("tb-attain");
  var tbWon=document.getElementById("tb-won");
  var tbTop=document.getElementById("tb-top");
  var tbRisk=document.getElementById("tb-risk");
  var tbRiskSep=document.getElementById("tb-risk-sep");
  if(tbPipe)tbPipe.textContent=_fmt(_tsNnacv);
  var covCls=(ts.coverage||0)>=3?"grn":(ts.coverage||0)>=2?"amb":"red";
  if(tbCov){tbCov.textContent=(ts.coverage||0).toFixed(1)+"×";tbCov.className="terr-bar-val "+covCls;}
  var attainCls=(ts.attainPct||0)>=80?"grn":(ts.attainPct||0)>=50?"amb":"red";
  if(tbAttain){tbAttain.textContent=_fmt(ts.attainProj||0)+" ("+(ts.attainPct||0)+"% quota)";tbAttain.className="terr-bar-val "+attainCls;}
  if(tbWon)tbWon.textContent=_fmt(ts.totalWon||0);
  if(tbTop&&ts.topDeal)tbTop.textContent=ts.topDeal;
  // Improvement 3: Win rate display in territory bar
  var tbWinRate=document.getElementById("tb-win-rate");
  var tbWinSep=document.getElementById("tb-win-sep");
  if(tbWinRate&&ts.winRate!=null){
    var winCls=ts.winRateColor==="G"?"grn":ts.winRateColor==="A"?"amb":ts.winRateColor==="R"?"red":"";
    tbWinRate.innerHTML="Win rate: <span class=\"terr-bar-val "+(winCls)+"\">"+ts.winRate+"%</span> <span style=\"font-size:9px;color:var(--mid)\">("+ts.cwCount+"W / "+(ts.cwCount+ts.clCount)+" closed)</span>";
    tbWinRate.style.display="flex";
    if(tbWinSep)tbWinSep.style.display="block";
  }
  var riskParts=[];
  if(ts.redAEs&&ts.redAEs.length)riskParts.push("🔴 "+ts.redAEs.join(", "));
  if(ts.amberAEs&&ts.amberAEs.length)riskParts.push("🟡 "+ts.amberAEs.join(", "));
  if(riskParts.length&&tbRisk&&tbRiskSep){
    tbRisk.innerHTML="At risk: "+riskParts.join(" · ");
    tbRisk.style.display="flex";
    tbRiskSep.style.display="block";
  }
}

var _currentModal=null;
function openModal(num,startTab){
  var _allDeals=PIPE_Q1.concat(typeof UNASSIGNED_DEALS!=="undefined"?UNASSIGNED_DEALS:[]);
  var d=_allDeals.filter(function(x){return x.num===num;})[0];
  if(!d)return;
  d._ns=d._ns||_nowsellScore(d);
  d._fc=d._fc||_getForecastCheck(d);
  _currentModal=d;
  var titleEl=document.getElementById("modal-title");
  var subEl=document.getElementById("modal-sub");
  if(titleEl)titleEl.textContent=(d.name&&d.name!==d.num)?d.name:d.account;
  if(subEl)subEl.textContent=d.num+" · "+d.ae+" · "+(d.terr||"");
  document.getElementById("dealModal").classList.add("open");
  switchModalTab(startTab||"status");
}
function closeModal(){document.getElementById("dealModal").classList.remove("open");_currentModal=null;}
function switchModalTab(tab){
  ["status","ns","coach"].forEach(function(t){
    var pane=document.getElementById("modal-pane-"+t);
    var tabEl=document.getElementById("modal-tab-"+t);
    if(pane)pane.style.display=(t===tab)?"block":"none";
    if(tabEl)tabEl.classList.toggle("active",t===tab);
  });
  var body=document.getElementById("modal-body");
  if(!body||!_currentModal)return;
  var d=_currentModal;
  var ns=d._ns;
  var fc=d._fc;
  var html="";
  if(tab==="status"){
    html+="<div id=\"modal-pane-status\">";
    html+="<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px\">";
    html+="<div class=\"ae-stat\"><div class=\"ae-stat-val "+((d.nnacv||0)<0?"a":"")+"\">"+_fmt(d.nnacv)+"</div><div class=\"ae-stat-lbl\">Net NNACV</div></div>";
    html+="<div class=\"ae-stat\"><div class=\"ae-stat-val\">"+d.prob+"%</div><div class=\"ae-stat-lbl\">Probability</div></div>";
    html+="<div class=\"ae-stat\"><div class=\"ae-stat-val\">"+(d.dtc<=0?"OVERDUE":d.dtc+"d")+"</div><div class=\"ae-stat-lbl\">Days to Close</div></div>";
    html+="</div>";
    html+="<table class=\"ns-tbl\"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>";
    html+="<tr><td style=\"color:var(--mid)\">Stage</td><td>"+d.stage+"</td></tr>";
    html+="<tr><td style=\"color:var(--mid)\">Close Date</td><td style=\"font-family:var(--mono)\">"+d.closeDate+"</td></tr>";
    html+="<tr><td style=\"color:var(--mid)\">Territory</td><td style=\"font-family:var(--mono);font-size:11px\">"+(d.terr||"")+"</td></tr>";
    html+="</tbody></table>";
    // ── Next Steps block (from Dynamics collaboration notes) ──────────────────
    var ns_text=(d.nextSteps||"").trim();
    var ns_date=(d.nextStepsDate||"").trim();
    var notes_sum=(d.notesSummary||"").trim();
    if(ns_text||notes_sum){
      html+="<div style=\"margin-top:14px\">";
      if(ns_text){
        // Stale flag: next steps older than 7 days get amber warning
        var nsStale=false;var nsDaysOld=null;
        if(ns_date){
          try{
            var nsD=new Date(ns_date);var now=new Date();
            nsDaysOld=Math.floor((now-nsD)/(1000*60*60*24));
            nsStale=nsDaysOld>7;
          }catch(e){}
        }
        var nsColor=nsStale?"var(--amber)":"var(--wasabi)";
        var nsBorder=nsStale?"rgba(245,166,35,.25)":"rgba(99,223,78,.2)";
        var nsBg=nsStale?"rgba(245,166,35,.05)":"rgba(99,223,78,.04)";
        html+="<div style=\"padding:10px 12px;background:"+nsBg+";border:1px solid "+nsBorder+";border-radius:8px;margin-bottom:8px\">";
        html+="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:"+nsColor+";text-transform:uppercase;letter-spacing:.5px\">📋 Next Steps"+(nsStale?" · ⚠ Stale":"")+"</div>";
        if(ns_date){
          var nsDateLabel=ns_date.length>10?ns_date.substring(0,10):ns_date;
          html+="<div style=\"font-size:9px;color:var(--mid);font-family:var(--mono)\">Updated: "+nsDateLabel+(nsDaysOld!==null?" ("+nsDaysOld+"d ago)":"")+"</div>";
        }
        html+="</div>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.6;white-space:pre-wrap\">"+ns_text.replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</div>";
        html+="</div>";
      }
      if(notes_sum){
        html+="<div style=\"padding:10px 12px;background:rgba(123,207,232,.04);border:1px solid rgba(123,207,232,.2);border-radius:8px\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:#7bcfe8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px\">🧠 7-Day Activity Summary</div>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.6\">"+notes_sum.replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</div>";
        html+="</div>";
      }
      html+="</div>";
    } else {
      html+="<div style=\"margin-top:10px;padding:8px 12px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--mid)\">📋 No Next Steps recorded in Dynamics. Ask "+d.ae+" to update collaboration notes after each customer interaction.</div>";
    }
    var gapKeys=MKEYS.filter(function(mk){return (ns[mk]||"r")!=="g";});
    if(gapKeys.length){
      html+="<div style=\"margin-top:14px;padding:10px 12px;background:rgba(245,166,35,.06);border:1px solid rgba(245,166,35,.2);border-radius:8px\">";
      html+="<div style=\"font-size:10px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px\">💡 Suggested next steps</div>";
      gapKeys.forEach(function(mk){
        var mv=ns[mk]||"r";
        var meta=NOWSELL_META[mk];
        var col=mv==="a"?"var(--amber)":"var(--red)";
        html+="<div style=\"display:flex;align-items:flex-start;gap:6px;margin-bottom:6px\">";
        html+="<span class=\"mc "+mv+"\" style=\"flex-shrink:0;margin-top:1px\">"+mk+"</span>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.4\"><strong style=\"color:"+col+"\">"+meta.label+":</strong> "+meta.action+"</div>";
        html+="</div>";
      });
      if(fc.probMismatch){
        html+="<div style=\"display:flex;align-items:flex-start;gap:6px;margin-bottom:6px\">";
        html+="<span style=\"background:rgba(167,139,250,.15);color:#c4b5fd;border:1px solid #c4b5fd;border-radius:3px;padding:2px 6px;font-size:10px;font-weight:700;flex-shrink:0;font-family:var(--mono)\">%</span>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.4\"><strong style=\"color:#c4b5fd\">Probability:</strong> Currently "+d.prob+"% but "+fc.forecastCode+" stage expects "+fc.probRange[0]+"–"+fc.probRange[1]+"%. Update in Dynamics.</div>";
        html+="</div>";
      }
      html+="</div>";
    } else {
      html+="<div style=\"margin-top:12px;padding:8px 12px;background:rgba(99,223,78,.06);border:1px solid rgba(99,223,78,.2);border-radius:8px;font-size:11px;color:var(--wasabi)\">✅ All NowSell milestones are aligned for this stage. Monitor close date and confirm EB engagement is current.</div>";
    }
    html+="<div style=\"margin-top:10px\"><a class=\"cd-crm-link\" href=\""+_crm(d.num)+"\" target=\"_blank\">🔗 Open in Dynamics CRM ↗</a></div>";
    html+="</div>";
  } else if(tab==="ns"){
    html+="<div id=\"modal-pane-ns\">";
    if(fc.probMismatch){
      html+="<div style=\"padding:10px 12px;background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.3);border-radius:8px;margin-bottom:12px\">";
      html+="<div style=\"font-size:11px;font-weight:700;color:#c4b5fd;margin-bottom:4px\">⚡ Probability Mismatch</div>";
      html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.5\">This deal is at <strong style=\"color:#c4b5fd\">"+d.prob+"%</strong> probability, but <strong>"+fc.forecastCode+"</strong> NowSell stage expects <strong style=\"color:#c4b5fd\">"+fc.probRange[0]+"–"+fc.probRange[1]+"%</strong>.</div>";
      html+="<div style=\"margin-top:6px;font-size:11px;color:var(--mid)\">→ <strong style=\"color:var(--off-white)\">In Dynamics:</strong> Open the opportunity record → edit Stage or Probability to align with actual deal position.</div>";
      html+="</div>";
    }
    MKEYS.forEach(function(mk){
      var mv=ns[mk]||"r";
      var meta=NOWSELL_META[mk];
      var statusText=mv==="g"?meta.g:mv==="a"?meta.a:meta.r;
      var col=mv==="g"?"var(--wasabi)":mv==="a"?"var(--amber)":"var(--red)";
      var statusLbl=mv==="g"?"✅ Complete":mv==="a"?"⚠️ In Progress":"❌ Not Started";
      var bgCol=mv==="g"?"rgba(99,223,78,.04)":mv==="a"?"rgba(245,166,35,.04)":"rgba(232,57,77,.04)";
      var borderCol=mv==="g"?"rgba(99,223,78,.2)":mv==="a"?"rgba(245,166,35,.2)":"rgba(232,57,77,.2)";
      html+="<div style=\"background:"+bgCol+";border:1px solid "+borderCol+";border-left:3px solid "+col+";border-radius:8px;padding:12px 14px;margin-bottom:10px\">";
      html+="<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\">";
      html+="<span class=\"mc "+mv+"\">"+mk+"</span>";
      html+="<span style=\"font-size:12px;font-weight:700;color:"+col+"\">"+meta.label+"</span>";
      html+="<span style=\"margin-left:auto;font-size:10px;color:"+col+";font-weight:700\">"+statusLbl+"</span>";
      html+="</div>";
      html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.5;margin-bottom:8px\">"+statusText+"</div>";
      if(mv!=="g"){
        var steps=DYNAMICS_ACTIONS[mk]?DYNAMICS_ACTIONS[mk][mv]:[];
        if(steps&&steps.length){
          html+="<div style=\"border-top:1px solid "+borderCol+";padding-top:8px;margin-top:4px\">";
          html+="<div style=\"font-size:10px;font-weight:700;color:#7bcfe8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px\">📋 How to update in Dynamics CRM</div>";
          steps.forEach(function(step,i){
            html+="<div style=\"display:flex;align-items:flex-start;gap:7px;margin-bottom:5px\">";
            html+="<span style=\"background:rgba(123,207,232,.15);color:#7bcfe8;border:1px solid rgba(123,207,232,.3);border-radius:3px;padding:1px 6px;font-family:var(--mono);font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px\">"+(i+1)+"</span>";
            html+="<span style=\"font-size:11px;color:var(--off-white);line-height:1.4\">"+step+"</span>";
            html+="</div>";
          });
          html+="</div>";
        }
      }
      html+="</div>";
    });
    html+="<div style=\"margin-top:6px\"><a class=\"cd-crm-link\" href=\""+_crm(d.num)+"\" target=\"_blank\">🔗 Open in Dynamics CRM ↗</a></div>";
    html+="</div>";
  } else if(tab==="coach"){
    html+="<div id=\"modal-pane-coach\">";
    html+="<div style=\"font-size:12px;color:var(--mid);margin-bottom:14px;line-height:1.5\">Manager coaching questions and 1-on-1 conversation starters for this deal.</div>";
    var hasGap=false;
    MKEYS.forEach(function(mk){
      var mv=ns[mk]||"r";
      var coach=MANAGER_COACH[mk];
      var coachText=mv==="g"?coach.g:mv==="a"?coach.a:coach.r;
      var col=mv==="g"?"var(--wasabi)":mv==="a"?"var(--amber)":"var(--red)";
      var bgCol=mv==="g"?"rgba(99,223,78,.04)":"rgba(0,0,0,.18)";
      var borderCol=mv==="g"?"rgba(99,223,78,.2)":mv==="a"?"rgba(245,166,35,.25)":"rgba(232,57,77,.25)";
      if(mv!=="g")hasGap=true;
      html+="<div style=\"background:"+bgCol+";border:1px solid "+borderCol+";border-left:3px solid "+col+";border-radius:8px;padding:12px 14px;margin-bottom:8px\">";
      html+="<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:7px\">";
      html+="<span class=\"mc "+mv+"\">"+mk+"</span>";
      html+="<span style=\"font-size:12px;font-weight:700;color:"+col+"\">"+NOWSELL_META[mk].label+"</span>";
      html+="</div>";
      html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.6\">"+coachText+"</div>";
      if(mv!=="g"){
        var steps=DYNAMICS_ACTIONS[mk]?DYNAMICS_ACTIONS[mk][mv]:[];
        if(steps&&steps.length){
          html+="<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid "+borderCol+"\">";
          html+="<div style=\"font-size:10px;font-weight:700;color:#7bcfe8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px\">📋 AE action in Dynamics</div>";
          html+="<div style=\"font-size:11px;color:var(--mid);line-height:1.4\">"+steps[0]+(steps[1]?" → "+steps[1]:"")+"</div>";
          html+="</div>";
        }
      }
      html+="</div>";
    });
    if(fc.probMismatch){
      html+="<div style=\"background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.3);border-left:3px solid #c4b5fd;border-radius:8px;padding:12px 14px;margin-bottom:8px\">";
      html+="<div style=\"font-size:12px;font-weight:700;color:#c4b5fd;margin-bottom:6px\">~ Probability Mismatch</div>";
      html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.6\">Deal is at <strong>"+d.prob+"%</strong> but <strong>"+fc.forecastCode+"</strong> stage expects <strong>"+fc.probRange[0]+"–"+fc.probRange[1]+"%</strong>. Ask AE: Does the stage accurately reflect the deal position?</div>";
      html+="</div>";
    }
    if(!hasGap&&!fc.probMismatch){
      html+="<div style=\"padding:12px;background:rgba(99,223,78,.06);border:1px solid rgba(99,223,78,.2);border-radius:8px;font-size:12px;color:var(--wasabi);line-height:1.5\">✅ All milestones complete and probability aligned. Confirm close date accuracy, verify no procurement blockers, and ensure EB is still committed.</div>";
    }
    html+="<div style=\"margin-top:10px\"><a class=\"cd-crm-link\" href=\""+_crm(d.num)+"\" target=\"_blank\">🔗 Open in Dynamics CRM ↗</a></div>";
    html+="</div>";
  }
  body.innerHTML=html;
}

// ── Hygiene modal ─────────────────────────────────────────────────────────────
function _hgModal(num){openHygieneModal(num);}
function openHygieneModal(num,startTab){
  var _allDeals=PIPE_Q1.concat(typeof UNASSIGNED_DEALS!=="undefined"?UNASSIGNED_DEALS:[]);
  var d=_allDeals.filter(function(x){return x.num===num;})[0];
  if(!d)return;
  d._ns=d._ns||_nowsellScore(d);
  d._fc=d._fc||_getForecastCheck(d);
  var ns=d._ns;var fc=d._fc;
  var body=document.getElementById("hg-body");
  if(!body)return;
  var html="";
  // ── gapMks = ALL non-green milestones — must match the badge colours on the pipeline row ──
  // Stage-gate missingOpen/missingClosed only covers required fields for the current stage.
  // The hygiene modal must coach on EVERY milestone that is red or amber, not just required ones.
  var gapMks=MKEYS.filter(function(mk){return (ns[mk]||"r")!=="g";});
  // Classify each: red (not started) vs amber (in progress)
  var redMks=MKEYS.filter(function(mk){return (ns[mk]||"r")==="r";});
  var ambMks=MKEYS.filter(function(mk){return (ns[mk]||"r")==="a";});
  var allClean=!fc.probMismatch&&!gapMks.length;
  // Stage-gate required gaps (for "Must be Opened / Must be Complete" labels)
  var stageRequired=(fc.missingOpen||[]).concat(fc.missingClosed||[]);

  // ── NNR #58: Health Since Last Run ──────────────────────────────────────────
  // Renders at the very top of the modal body — before prob mismatch and milestones.
  // DEAL_TRENDS is a dict keyed by opportunity num. On first run it is {} (empty object).
  var _hasTrends = typeof DEAL_TRENDS !== "undefined";
  var _trend = _hasTrends ? (DEAL_TRENDS[d.num] || null) : null;
  html += "<div class=\"hygiene-section\" style=\"margin-bottom:12px;border-color:rgba(123,207,232,.25)\">";
  html += "<div class=\"hygiene-section-label\" style=\"color:#7bcfe8;font-size:10px\">📈 Health Since Last Run</div>";
  if (!_hasTrends || !_trend || _trend.stage_delta === "new") {
    html += "<div style=\"font-size:11px;color:var(--mid);padding:6px 0\">No prior run data — trend will appear after your next daily run.</div>";
  } else {
    // Probability row
    var _pd = _trend.prob_delta || 0;
    var _pdColor = _pd > 0 ? "var(--wasabi)" : _pd < 0 ? "var(--red)" : "var(--mid)";
    var _pdIcon  = _pd > 0 ? "↑" : _pd < 0 ? "↓" : "→";
    var _pdLabel = _pd > 0 ? "+" + _pd + "% probability" : _pd < 0 ? _pd + "% probability" : "Probability unchanged";
    html += "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:5px;font-size:12px\">";
    html += "<span style=\"font-weight:700;color:" + _pdColor + ";min-width:14px\">" + _pdIcon + "</span>";
    html += "<span style=\"color:" + _pdColor + ";font-weight:600\">" + _pdLabel + "</span>";
    html += "</div>";
    // Stage row
    var _sd = _trend.stage_delta || "unchanged";
    var _sdColor = _sd === "advanced" ? "var(--wasabi)" : _sd === "regressed" ? "var(--red)" : _sd === "stalled" ? "var(--amber)" : "var(--mid)";
    var _sdIcon  = _sd === "advanced" ? "✅" : _sd === "regressed" ? "🔴" : _sd === "stalled" ? "⚠️" : "→";
    var _sdLabel = _sd === "advanced" ? "Stage advanced" : _sd === "regressed" ? "Stage regressed" : _sd === "stalled" ? "Stage stalled" : "Stage unchanged";
    html += "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:5px;font-size:12px\">";
    html += "<span style=\"min-width:14px\">" + _sdIcon + "</span>";
    html += "<span style=\"color:" + _sdColor + ";font-weight:600\">" + _sdLabel + "</span>";
    html += "</div>";
    // Next Steps row
    var _nsd = _trend.ns_delta || "stale";
    var _nsdColor = _nsd === "fresh" ? "var(--wasabi)" : "var(--amber)";
    var _nsdIcon  = _nsd === "fresh" ? "✅" : "⚠️";
    var _nsdLabel = _nsd === "fresh" ? "Next Steps updated since last run" : "Next Steps unchanged since last run";
    html += "<div style=\"display:flex;align-items:center;gap:10px;font-size:12px\">";
    html += "<span style=\"min-width:14px\">" + _nsdIcon + "</span>";
    html += "<span style=\"color:" + _nsdColor + ";font-weight:600\">" + _nsdLabel + "</span>";
    html += "</div>";
  }
  html += "</div>";

  // ── Header ─────────────────────────────────────────────────────────────────
  html+="<div style=\"margin-bottom:14px\">";
  html+="<div style=\"font-size:15px;font-weight:700;color:var(--white);margin-bottom:3px\">"+(d.name&&d.name!==d.num?d.name:d.account)+"</div>";
  html+="<div style=\"font-size:11px;color:var(--mid)\">"+d.num+" · "+(d.ae||"Unassigned")+" · "+d.stage+"</div>";
  // Overall status badge — colour matches worst milestone
  var badgeCls=redMks.length?"background:rgba(232,57,77,.12);color:var(--red);border:1px solid rgba(232,57,77,.35)":ambMks.length?"background:rgba(245,166,35,.1);color:var(--amber);border:1px solid rgba(245,166,35,.3)":"background:rgba(99,223,78,.12);color:var(--wasabi);border:1px solid rgba(99,223,78,.35)";
  var badgeLabel=allClean?"✅ Forecast Clean":(redMks.length?" ❌ "+redMks.length+" Not Started"+(ambMks.length?" · ⚠️ "+ambMks.length+" In Progress":""):" ⚠️ "+ambMks.length+" In Progress")+(fc.probMismatch?" + Prob Mismatch":"");
  html+="<div style=\"margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap\">";
  html+="<span style=\"font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;"+badgeCls+"\">"+badgeLabel+"</span>";
  html+="<span style=\"font-size:10px;color:var(--mid)\">"+(d.prob)+"% probability · Close "+d.closeDate+(typeof d.dtc==="number"?" · "+(d.dtc<=0?"OVERDUE":d.dtc+"d remaining"):"")+"</span>";
  html+="</div>";
  html+="</div>";

  // ── Probability mismatch banner ─────────────────────────────────────────────
  if(fc.probMismatch){
    html+="<div class=\"hygiene-section\" style=\"border-color:rgba(167,139,250,.3);margin-bottom:12px\">";
    html+="<div class=\"hygiene-section-label\" style=\"color:#c4b5fd\">⚡ Probability Mismatch</div>";
    html+="<div class=\"hygiene-step\"><span class=\"hygiene-step-num\">!</span>";
    html+="<span>Deal is at <strong style=\"color:#c4b5fd\">"+d.prob+"%</strong> probability, but <strong>"+fc.forecastCode+"</strong> stage expects <strong style=\"color:#c4b5fd\">"+fc.probRange[0]+"–"+fc.probRange[1]+"%</strong>.</span></div>";
    html+="<div style=\"font-size:11px;color:var(--mid);margin-top:6px;padding-left:32px\">→ <strong style=\"color:var(--off-white)\">In Dynamics:</strong> Open the opportunity record → edit Stage or Probability to align with actual deal position. Current stage: <strong style=\"color:var(--off-white)\">"+d.stage+"</strong></div>";
    html+="</div>";
  }

  // ── v16.7: Deal Review banner for Stage 3 (Qualify) and Stage 4b (Propose) ─
  // NowSell v5 marks these stages ★ — Deal Review Required before progression.
  var _stageStr=(d.stage||"").toLowerCase();
  var _isDealReviewStage=(_stageStr.indexOf("3-")===0||_stageStr.indexOf("3 -")===0||_stageStr.match(/^3\s/))||
                         (_stageStr.indexOf("4b")>=0);
  if(_isDealReviewStage){
    html+="<div class=\"hygiene-section\" style=\"border-color:rgba(245,166,35,.4);margin-bottom:12px;background:rgba(245,166,35,.05)\">";
    html+="<div class=\"hygiene-section-label\" style=\"color:var(--amber)\">⭐ Deal Review Required — NowSell v5</div>";
    html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.5;padding:4px 0\">";
    if(_stageStr.indexOf("4b")>=0){
      html+="This deal is at Stage 4b (Propose). NowSell requires a Deal Review before progressing to Stage 5 (Negotiate). AE + SC must conduct the review.";
      html+="<div style=\"font-size:11px;color:var(--mid);margin-top:5px\">→ Confirm: SC has marked Technical Win engagement Complete (Green). BVA engagement is Open. Exec proposal is drafted. EB meeting is booked.</div>";
    } else {
      html+="This deal is at Stage 3 (Qualify). NowSell recommends a Deal Review before progression to Stage 4a. AE + SC should review deal position and partner strategy.";
      html+="<div style=\"font-size:11px;color:var(--mid);margin-top:5px\">→ Confirm: Discovery engagement is Complete (Green). Champion is qualified. BANT is documented. Partner RTM is confirmed.</div>";
    }
    html+="</div></div>";
  }

  // ── All 6 NowSell milestones — gaps get full coaching, complete get green confirmation ──
  if(gapMks.length){
    html+="<div class=\"hygiene-section\" style=\"margin-bottom:0\">";
    html+="<div class=\"hygiene-section-label\" style=\"color:"+(redMks.length?"var(--red)":"var(--amber)")+"\">△ NowSell Coaching Required</div>";
  }
  MKEYS.forEach(function(mk){
    var meta=NOWSELL_META[mk];
    var mv=ns[mk]||"r";
    var isGap=gapMks.indexOf(mk)>=0;
    var isStageRequired=stageRequired.indexOf(mk)>=0;
    var isClosedGap=(fc.missingClosed||[]).indexOf(mk)>=0;

    // v16.7: Engagement evidence from Call 1f
    var engRecord=(d.engagements&&d.engagements[mk])||null;

    if(isGap){
      // ── GAP milestone: full coaching block — colour matches badge ──────────
      var borderCol=mv==="r"?"rgba(232,57,77,.3)":"rgba(245,166,35,.3)";
      var labelColor=mv==="r"?"var(--red)":"var(--amber)";
      var statusIcon=mv==="r"?"❌":"⚠️";
      var statusLabel=mv==="r"?"Not Started":"In Progress";
      if(isStageRequired) statusLabel=isClosedGap?"Must be Complete":"Must be Opened";

      // v16.7: If engagement record exists, upgrade status label with evidence
      if(engRecord&&mv==="a"){
        statusLabel="In Progress (Dynamics: "+( engRecord.status==="a"?"Open":engRecord.status)+")";
      }

      html+="<div style=\"margin-bottom:14px;padding:12px 14px;background:rgba(0,0,0,.18);border:1px solid "+borderCol+";border-left:3px solid "+labelColor+";border-radius:8px\">";
      // Milestone header row — v16.7: add RACI owner badge
      var ownerLabel=meta.owner||"AE";
      var ownerColor=ownerLabel==="SC"?"#7bcfe8":"var(--wasabi)";
      var ownerBg=ownerLabel==="SC"?"rgba(123,207,232,.12)":"rgba(99,223,78,.1)";
      html+="<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap\">";
      html+="<span class=\"mc "+mv+"\">"+mk+"</span>";
      html+="<span style=\"font-size:13px;font-weight:700;color:"+labelColor+"\">"+meta.label+"</span>";
      // RACI owner badge
      html+="<span style=\"font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;background:"+ownerBg+";color:"+ownerColor+";border:1px solid "+ownerColor+";opacity:.9\">Owner: "+ownerLabel+"</span>";
      html+="<span style=\"margin-left:auto;font-size:10px;font-weight:700;color:"+labelColor+";padding:2px 8px;border-radius:8px;border:1px solid "+borderCol+"\">"+statusIcon+" "+statusLabel+"</span>";
      html+="</div>";

      // v16.7: Owner note (only for SC-owned milestones, makes governance explicit)
      if(meta.ownerNote){
        html+="<div style=\"font-size:10px;color:var(--mid);margin-bottom:8px;font-style:italic\">ℹ️ "+meta.ownerNote+"</div>";
      }

      // Status description
      var statusText=(mv==="a"?meta.a:meta.r)||"";
      html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.5;margin-bottom:10px\">"+statusText+"</div>";

      // v16.7: Engagement evidence block (shown when Call 1f data is available)
      if(engRecord){
        var engStatusLabel=engRecord.status==="g"?"Complete":engRecord.status==="a"?"Open / In Progress":"Unknown";
        html+="<div style=\"margin-bottom:10px;padding:7px 10px;background:rgba(123,207,232,.06);border:1px solid rgba(123,207,232,.2);border-radius:6px\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:#7bcfe8;margin-bottom:4px\">📋 Dynamics Engagement Evidence</div>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.5\">";
        if(engRecord.engId)html+="Engagement <strong style=\"color:#7bcfe8\">"+(engRecord.engId+"").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</strong> · Status: <strong>"+engStatusLabel+"</strong>";
        if(engRecord.assignedTo)html+=" · Assigned: <strong style=\"color:var(--wasabi)\">"+(engRecord.assignedTo+"").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</strong>";
        html+="</div>";
        html+="<div style=\"font-size:10px;color:var(--mid);margin-top:3px\">Source: Dynamics Engagements tab — verify current status in CRM ↗</div>";
        html+="</div>";
      }

      // v16.7: Next Steps keyword evidence (NNR #44)
      var _nsEvidence="";
      var _nsKeywords={"TV":["demo","poc","proof of concept","technical win","validation","technical review","workshop"],
                       "BC":["bva","business value","roi","business case","economic buyer","eb presentation"],
                       "MP":["mutual plan","mutual success","milestones","joint plan","map"],
                       "DIS":["champion","bant","discovery","budget","authority","timing"]};
      var _kwList=_nsKeywords[mk]||[];
      if(_kwList.length){
        var _nsSearch=((d.nextSteps||"")+" "+(d.notesSummary||"")).toLowerCase();
        var _matchedKw=_kwList.filter(function(kw){return _nsSearch.indexOf(kw)>=0;});
        if(_matchedKw.length){
          // Find the first relevant snippet
          var _snippet="";
          var _fullText=(d.nextSteps||d.notesSummary||"");
          var _lc=_fullText.toLowerCase();
          var _firstKw=_matchedKw[0];
          var _kwPos=_lc.indexOf(_firstKw);
          if(_kwPos>=0){
            var _start=Math.max(0,_kwPos-30);
            var _end=Math.min(_fullText.length,_kwPos+90);
            _snippet=(_start>0?"…":"")+_fullText.slice(_start,_end)+(_end<_fullText.length?"…":"");
          }
          _nsEvidence=_snippet||_matchedKw.join(", ")+" mentioned";
        }
      }
      if(_nsEvidence){
        html+="<div style=\"margin-bottom:10px;padding:7px 10px;background:rgba(245,166,35,.04);border-left:2px solid rgba(245,166,35,.4);border-radius:0 6px 6px 0\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:var(--amber);margin-bottom:3px\">📝 Evidence from Next Steps</div>";
        html+="<div style=\"font-size:11px;color:var(--mid);line-height:1.5;font-style:italic\">\""+_nsEvidence.replace(/</g,"&lt;").replace(/>/g,"&gt;")+"\"</div>";
        html+="<div style=\"font-size:9px;color:var(--mid);margin-top:2px\">Source: Dynamics Next Steps — evidence only, not used for scoring</div>";
        html+="</div>";
      }

      // Manager Ask — v16.7: use meta.managerAsk for owner-aware direction
      var _managerAskLabel=meta.owner==="SC"?"Manager — Ask the SC":"Manager — Ask the AE";
      html+="<div style=\"font-size:11px;font-weight:700;color:#7bcfe8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px\">"+_managerAskLabel+"</div>";
      var coachText=(meta.managerAsk||(mv==="a"?MANAGER_COACH[mk].a:MANAGER_COACH[mk].r))||"";
      html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.6;margin-bottom:10px;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:6px;font-style:italic\">"+coachText+"</div>";
      // Discovery Probes
      if(meta.probes&&meta.probes.length){
        html+="<div style=\"font-size:11px;font-weight:700;color:var(--wasabi);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px\">Discovery Probes</div>";
        html+="<ul style=\"padding-left:16px;margin-bottom:10px;margin-top:0\">";
        meta.probes.forEach(function(p){html+="<li style=\"font-size:11px;color:var(--off-white);margin-bottom:4px;line-height:1.5\">"+p+"</li>";});
        html+="</ul>";
      }
      // Update in Dynamics CRM
      if(meta.crm&&meta.crm.length){
        html+="<div style=\"font-size:11px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px\">Update in Dynamics CRM</div>";
        html+="<ul style=\"padding-left:16px;margin:0\">";
        meta.crm.forEach(function(c){html+="<li style=\"font-size:11px;color:var(--off-white);margin-bottom:4px;line-height:1.5\">"+c+"</li>";});
        html+="</ul>";
      }
      html+="</div>";
    } else {
      // ── COMPLETE milestone: compact green confirmation row — v16.7: show owner badge ──
      var _ownerLblC=meta.owner||"AE";
      var _ownerColorC=_ownerLblC==="SC"?"#7bcfe8":"var(--wasabi)";
      html+="<div style=\"display:flex;align-items:center;gap:8px;padding:7px 10px;margin-bottom:6px;background:rgba(99,223,78,.04);border:1px solid rgba(99,223,78,.15);border-radius:6px\">";
      html+="<span class=\"mc g\" style=\"flex-shrink:0\">"+mk+"</span>";
      html+="<span style=\"font-size:12px;font-weight:600;color:var(--wasabi)\">"+meta.label+"</span>";
      html+="<span style=\"font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;background:rgba(99,223,78,.08);color:"+_ownerColorC+";opacity:.8\">"+_ownerLblC+"</span>";
      html+="<span style=\"font-size:10px;font-weight:700;color:var(--wasabi);margin-left:auto\">✅ Complete</span>";
      html+="</div>";
    }
  });
  if(gapMks.length){html+="</div>";}

  // ── All clean summary ───────────────────────────────────────────────────────
  if(allClean){
    html+="<div class=\"hygiene-section\" style=\"border-color:rgba(99,223,78,.25);margin-top:12px\">";
    html+="<div style=\"font-size:13px;font-weight:700;color:var(--wasabi);margin-bottom:6px\">✅ Forecast Hygiene Clean</div>";
    html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.6\">All 6 NowSell milestones are aligned for this stage and probability is correct.</div>";
    html+="<div style=\"font-size:11px;color:var(--mid);margin-top:8px;line-height:1.5\">Recommended: Confirm close date accuracy with AE in next 1:1. Verify EB is still committed and no procurement blockers have emerged. Confirm Order Form is on track for SURF submission.</div>";
    html+="</div>";
  }

  html+="<div style=\"margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap\">";
  html+="<a class=\"cd-crm-link\" href=\""+_crm(d.num)+"\" target=\"_blank\">🔗 Open "+d.num+" in Dynamics CRM ↗</a>";
  if(d.ae&&d.ae!=="Unassigned"){
    var _safeAeHg=d.ae.replace(/'/g,"\\'");
    html+="<button class=\"copy-brief-btn\" onclick=\"draftEmailToAE('"+_safeAeHg+"',this)\" style=\"border-color:rgba(99,223,78,.4)\">✉ Email "+d.ae.split(" ")[0]+"</button>";
    html+="<button class=\"copy-brief-btn\" onclick=\"copyCoachBrief('"+_safeAeHg+"',this)\">📋 Copy Brief</button>";
  }
  html+="</div>";
  body.innerHTML=html;
  document.getElementById("hg-overlay").classList.add("open");
}
function closeHygieneModal(){document.getElementById("hg-overlay").classList.remove("open");}

// ── AE modal ──────────────────────────────────────────────────────────────────
function openAEModal(rank){
  var sorted=AE_DATA.slice().sort(function(a,b){return (b.won||0)-(a.won||0);});
  var ae=sorted[rank];
  if(!ae)return;
  var titleEl=document.getElementById("ae-modal-title");
  var subEl=document.getElementById("ae-modal-sub");
  var avatarEl=document.getElementById("ae-modal-avatar");
  var statsEl=document.getElementById("ae-modal-stats");
  var bodyEl=document.getElementById("ae-modal-body");
  if(titleEl)titleEl.textContent=ae.n;
  if(subEl)subEl.textContent=(ae.terr||"")+" · "+(ae.dist||"");
  if(avatarEl){
    var initials=(ae.init||(ae.n||"AE").split(" ").map(function(p){return p[0];}).join("").substring(0,2)).toUpperCase();
    var riskBg=ae.risk==="R"?"rgba(232,57,77,.3)":ae.risk==="A"?"rgba(245,166,35,.25)":"rgba(99,223,78,.2)";
    var riskFg=ae.risk==="R"?"var(--red)":ae.risk==="A"?"var(--amber)":"var(--wasabi)";
    avatarEl.style.background=riskBg;avatarEl.style.color=riskFg;avatarEl.textContent=initials;
  }
  if(statsEl){
    statsEl.innerHTML="<div class=\"ae-modal-stat\"><div class=\"ae-modal-stat-val "+(ae.won<0?"a":"")+"\">"+_fmt(ae.won)+"</div><div class=\"ae-modal-stat-lbl\">Won</div></div>"
      +"<div class=\"ae-modal-stat\"><div class=\"ae-modal-stat-val\">"+_fmt(ae.pipe)+"</div><div class=\"ae-modal-stat-lbl\">Pipeline</div></div>"
      +"<div class=\"ae-modal-stat\" title=\"Weighted pipeline = positive deals × stage probability\"><div class=\"ae-modal-stat-val\">"+_fmt(_wtdForAE(ae.n))+"</div><div class=\"ae-modal-stat-lbl\">Wtd Pipe</div></div>"
      +"<div class=\"ae-modal-stat\"><div class=\"ae-modal-stat-val\">"+(ae.deals||0)+"</div><div class=\"ae-modal-stat-lbl\">Open Deals</div></div>";
  }
  if(bodyEl){
    var aeDeals=PIPE_Q1.filter(function(d){return d.ae===ae.n;}).sort(function(a,b){return (b.nnacv||0)-(a.nnacv||0);});
    var html="<div id=\"ae-pane-deals\">";
    if(!aeDeals.length){html+="<div style=\"color:var(--mid);font-size:12px;padding:14px\">No open deals this quarter.</div>";}
    aeDeals.forEach(function(d,di){
      var ns=d._ns||_nowsellScore(d);
      var dealTitle=(d.name&&d.name!==d.account&&d.name!==d.num)?d.name:d.account;
      var nc=(d.nnacv||0)<0?"nnacv-neg":"nnacv-pos";
      html+="<div class=\"ae-deal-card\" id=\"aedc-"+di+"\">";
      html+="<div class=\"ae-deal-card-hdr\" onclick=\"toggleAEDealCard('aedealBody-"+di+"','aedc-"+di+"')\">";
      html+="<div style=\"flex:1\"><div style=\"font-weight:600;font-size:12px\">"+dealTitle+"</div><div style=\"font-size:10px;color:var(--mid);font-family:var(--mono)\">"+d.num+" · "+d.stage+"</div></div>";
      html+="<span class=\""+nc+"\" style=\"font-size:12px;font-weight:700;margin-right:8px\">"+_fmt(d.nnacv)+"</span>";
      html+="<span style=\"font-size:11px;padding:2px 7px;border-radius:8px;background:rgba(99,223,78,.1);color:var(--wasabi)\">"+d.prob+"%</span>";
      html+="</div>";
      html+="<div class=\"ae-deal-card-body\" id=\"aedealBody-"+di+"\">";
      html+="<div class=\"ae-deal-coach-tabs\">";
      html+="<div class=\"ae-deal-coach-tab active\" id=\"aetab-s-"+di+"\" onclick=\"switchAEDealTab("+di+",'status')\">📊 Status</div>";
      html+="<div class=\"ae-deal-coach-tab\" id=\"aetab-m-"+di+"\" onclick=\"event.stopPropagation();switchAEDealTab("+di+",'manager')\">👔 Manager</div>";
      html+="<div class=\"ae-deal-coach-tab\" id=\"aetab-n-"+di+"\" onclick=\"event.stopPropagation();switchAEDealTab("+di+",'nowsell')\">🎯 NowSell</div>";
      html+="</div>";
      html+="<div class=\"ae-deal-coach-pane active\" id=\"aepane-status-"+di+"\">";
      var nsCells2="";
      MKEYS.forEach(function(mk){
        var mv=ns[mk]||"r";
        nsCells2+="<span class=\"ns-badge mc "+mv+"\" onclick=\"event.stopPropagation();openHygieneModal('"+d.num+"')\" title=\""+mk+"\">"+(mv==="g"?"✅":"⚠️")+" "+mk+"</span>";
      });
      html+="<div class=\"ae-deal-ns-row\">"+nsCells2+"</div>";
      html+="<div style=\"margin-top:8px;font-size:11px;color:var(--mid)\">Stage: <span style=\"color:var(--off-white)\">"+d.stage+"</span> · Close: <span style=\"color:var(--off-white)\">"+d.closeDate+"</span></div>";
      // ── Next Steps inline block (NNR #56 / PD #26) ──────────────────────────
      var ns_txt=(d.nextSteps||"").trim();
      var ns_dt=(d.nextStepsDate||"").trim();
      var ns_days=ns_dt?(Math.floor((Date.now()-new Date(ns_dt).getTime())/86400000)):-1;
      var ns_stale=ns_days>7;
      if(ns_txt){
        var ns_col=ns_stale?"var(--amber)":"var(--wasabi)";
        var ns_label="📋 Next Steps"+(ns_stale?" · ⚠ Stale ("+ns_days+"d)":"");
        html+="<div style=\"margin-top:8px;padding:7px 10px;border-left:2px solid "+ns_col+";background:rgba(99,223,78,.04);border-radius:0 6px 6px 0\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:"+ns_col+";text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px\">"+ns_label+"</div>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.5\">"+ns_txt.substring(0,200)+(ns_txt.length>200?"…":"")+"</div>";
        html+="</div>";
      } else {
        html+="<div style=\"margin-top:8px;padding:6px 10px;border-left:2px solid var(--border);border-radius:0 6px 6px 0;font-size:10px;color:var(--mid)\">📋 No Next Steps recorded. Ask "+d.ae+" to update Dynamics after each customer interaction.</div>";
      }
      // ────────────────────────────────────────────────────────────────────────
      html+="<div style=\"margin-top:8px\"><a class=\"act-btn crm-btn\" href=\""+_crm(d.num)+"\" target=\"_blank\" style=\"font-size:10px;padding:3px 9px;display:inline-block\">🔗 CRM ↗</a>";
      html+="<button onclick=\"event.stopPropagation();openModal('"+d.num+"','coach')\" style=\"margin-left:6px;padding:3px 9px;font-size:10px;font-weight:700;border:1px solid #7bcfe8;background:rgba(123,207,232,.1);color:#7bcfe8;border-radius:4px;cursor:pointer\">👔 Coach</button></div>";
      html+="</div>";
      html+="<div class=\"ae-deal-coach-pane\" id=\"aepane-manager-"+di+"\">";
      MKEYS.forEach(function(mk){
        var mv=ns[mk]||"r";
        if(mv==="g")return;
        var coach=MANAGER_COACH[mk];
        html+="<div style=\"margin-bottom:10px;padding:8px 10px;background:rgba(232,57,77,.04);border:1px solid rgba(232,57,77,.15);border-radius:6px\">";
        html+="<div style=\"font-size:10px;font-weight:700;color:var(--amber);text-transform:uppercase;margin-bottom:4px\">"+mk+" — "+NOWSELL_META[mk].label+"</div>";
        html+="<div style=\"font-size:11px;color:var(--off-white);line-height:1.5\">"+coach.r+"</div>";
        html+="</div>";
      });
      html+="</div>";
      html+="<div class=\"ae-deal-coach-pane\" id=\"aepane-nowsell-"+di+"\">";
      MKEYS.forEach(function(mk){
        var mv=ns[mk]||"r";
        var col=mv==="g"?"var(--wasabi)":mv==="a"?"var(--amber)":"var(--red)";
        html+="<div style=\"display:flex;align-items:center;gap:6px;margin-bottom:6px\">";
        html+="<span class=\"mc "+mv+"\">"+mk+"</span>";
        html+="<span style=\"font-size:11px;color:"+col+";font-weight:700\">"+NOWSELL_META[mk].label+"</span>";
        html+="<span style=\"font-size:11px;color:var(--mid)\">— "+(mv==="g"?NOWSELL_META[mk].g:mv==="a"?NOWSELL_META[mk].a:NOWSELL_META[mk].r)+"</span>";
        html+="</div>";
      });
      html+="</div>";
      html+="</div></div>";
    });
    html+="</div>";
    bodyEl.innerHTML=html;
  }
  document.getElementById("aeModal").classList.add("open");
}
function closeAEModal(){document.getElementById("aeModal").classList.remove("open");}
function switchAETab(tab){
  ["deals"].forEach(function(t){
    var pane=document.getElementById("ae-pane-"+t);
    var tabEl=document.getElementById("aetab-"+t);
    if(pane)pane.style.display=(t===tab)?"block":"none";
    if(tabEl)tabEl.classList.toggle("active",t===tab);
  });
}
function switchAEDealTab(idx,tab){
  var paneNames=["status","manager","nowsell"];
  var tabKeys=["s","m","n"];
  paneNames.forEach(function(name,i){
    var pane=document.getElementById("aepane-"+name+"-"+idx);
    var tabEl=document.getElementById("aetab-"+tabKeys[i]+"-"+idx);
    var isActive=(name===tab);
    if(pane)pane.classList.toggle("active",isActive);
    if(tabEl)tabEl.classList.toggle("active",isActive);
  });
}
function toggleAEDealCard(bodyId,cardId){
  var body=document.getElementById(bodyId);
  var card=document.getElementById(cardId);
  if(body)body.classList.toggle("open");
  if(card)card.classList.toggle("open");
}

// ── Badge coaching popover ────────────────────────────────────────────────────
function openBadgeCoach(type,rank){
  var sorted=AE_DATA.slice().sort(function(a,b){return (b.won||0)-(a.won||0);});
  var ae=sorted[rank];
  if(!ae)return;
  var bcBody=document.getElementById("bcBody");
  if(!bcBody)return;
  var title="",text="",actions=[];
  if(type==="cov"){title="📊 Pipeline Coverage";text=ae.covReason||"";actions=ae.covActions||[];}
  else if(type==="pace"){title="⏱ QTD Pacing";text=ae.paceReason||"";actions=ae.paceActions||[];}
  else if(type==="rag"){title="🚦 Overall Risk";text=ae.riskReason||"";actions=ae.riskActions||[];}
  else if(type==="pipe"){
    title="🏗 Pipeline Generation — Sourcing Plays";
    text="Coverage is "+ae.coverage+"×. These plays are ordered fastest-to-slowest path to new CQ pipeline. Run these in your next 1:1 with "+ae.n.split(" ")[0]+".";
    actions=ae.pipeActions||[];
  }
  var html="<div style=\"font-size:14px;font-weight:700;color:var(--wasabi);margin-bottom:10px\">"+title+"</div>";
  html+="<div style=\"font-size:12px;color:var(--off-white);line-height:1.6;margin-bottom:12px\">"+ae.n+" — "+text+"</div>";
  actions.forEach(function(a){html+="<div class=\"coach-action-item\">"+a+"</div>";});
  html+="<div style=\"margin-top:12px;border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:flex-end\">";
  html+="<button onclick=\"closeBadgeCoach()\" style=\"padding:6px 16px;background:var(--dark-teal);border:1px solid var(--border);color:var(--mid);border-radius:6px;cursor:pointer;font-size:12px\">Close</button>";
  html+="</div>";
  bcBody.innerHTML=html;
  document.getElementById("bcOverlay").classList.add("open");
}
function closeBadgeCoach(){document.getElementById("bcOverlay").classList.remove("open");}

// ── Days-to-close popover ─────────────────────────────────────────────────────
function _closeDtcPop(){var p=document.getElementById("dtc-popover");if(p)p.remove();}
function showDtcExplainer(btn,dtc,closeDate){
  var existing=document.getElementById("dtc-popover");
  if(existing){if(existing._sourceBtn===btn){existing.remove();return;}existing.remove();}
  var urgColor=dtc<=7?"var(--red)":dtc<=14?"var(--amber)":"var(--wasabi)";
  var urgency=dtc<=0?"🔴 OVERDUE — immediate action required.":dtc<=7?"🔴 Critical — close imminent. Action today.":dtc<=14?"🟡 Urgent — less than two weeks. Escalate coaching.":"🟢 Normal — healthy runway remaining.";
  var pop=document.createElement("div");
  pop.id="dtc-popover";pop._sourceBtn=btn;
  pop.style.cssText="position:fixed;z-index:600;background:var(--drawer-bg);border:1px solid var(--border);border-radius:10px;padding:14px 16px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,.6);font-size:12px;line-height:1.5";
  pop.innerHTML="<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px'>"
    +"<span style='font-size:13px;font-weight:700;color:var(--wasabi)'>⏱ Days to Close</span>"
    +"<button onclick='_closeDtcPop()' style='background:none;border:none;color:var(--mid);cursor:pointer;font-size:16px;line-height:1'>✕</button>"
    +"</div>"
    +"<div style='margin-bottom:8px'><span style='font-size:22px;font-weight:700;color:"+urgColor+"'>"+(dtc<=0?"OVERDUE":dtc+"d")+"</span>"
    +" <span style='font-size:11px;color:var(--mid)'>until "+closeDate+"</span></div>"
    +"<div style='font-size:12px;color:"+urgColor+";font-weight:600;margin-bottom:10px'>"+urgency+"</div>"
    +"<div style='border-top:1px solid var(--border);padding-top:10px'>"
    +"<div style='font-size:10px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px'>Colour Guide</div>"
    +"<div style='display:flex;flex-direction:column;gap:4px'>"
    +"<div style='display:flex;align-items:center;gap:8px'><span style='width:32px;text-align:center;font-size:10px;font-weight:700;padding:1px 4px;border-radius:3px;background:rgba(232,57,77,.2);color:var(--red);border:1px solid var(--red)'>7d</span><span style='font-size:11px;color:var(--off-white)'>🔴 ≤7 days — Critical</span></div>"
    +"<div style='display:flex;align-items:center;gap:8px'><span style='width:32px;text-align:center;font-size:10px;font-weight:700;padding:1px 4px;border-radius:3px;background:rgba(245,166,35,.2);color:var(--amber);border:1px solid var(--amber)'>14d</span><span style='font-size:11px;color:var(--off-white)'>🟡 ≤14 days — Urgent</span></div>"
    +"<div style='display:flex;align-items:center;gap:8px'><span style='width:32px;text-align:center;font-size:10px;font-weight:700;padding:1px 4px;border-radius:3px;background:rgba(99,223,78,.12);color:var(--wasabi);border:1px solid var(--wasabi)'>+d</span><span style='font-size:11px;color:var(--off-white)'>🟢 >14 days — Normal</span></div>"
    +"</div></div>";
  document.body.appendChild(pop);
  var rect=btn.getBoundingClientRect();
  var top=rect.bottom+6;var left=rect.left;
  if(left+300>window.innerWidth)left=window.innerWidth-310;
  if(top+220>window.innerHeight)top=rect.top-226;
  pop.style.top=top+"px";pop.style.left=left+"px";
  setTimeout(function(){
    document.addEventListener("click",function handler(e){
      var p=document.getElementById("dtc-popover");
      if(p&&!p.contains(e.target)&&e.target!==btn){p.remove();document.removeEventListener("click",handler);}
    });
  },10);
}

// ── Forward quarter report ────────────────────────────────────────────────────
function runQtrReport(q){
  var meta=_QTR_META[q];
  if(!meta)return;
  var btn=document.getElementById("btn-"+q);
  var stat=document.getElementById("status-"+q);
  var resultsDiv=document.getElementById(q+"-results");
  if(btn){btn.disabled=true;btn.classList.add("loading");var bt=btn.querySelector(".btn-txt");if(bt)bt.textContent="Preparing...";}
  var trigger=meta.trigger||("my pipeline "+meta.label);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(trigger).then(function(){showQtrInstructions(q,trigger,btn,stat,resultsDiv);}).catch(function(){showQtrInstructions(q,trigger,btn,stat,resultsDiv);});
  } else {
    showQtrInstructions(q,trigger,btn,stat,resultsDiv);
  }
}
function showQtrInstructions(q,trigger,btn,stat,resultsDiv){
  var meta=_QTR_META[q];var stats=_QTR_STATS[q];
  if(resultsDiv){
    resultsDiv.style.display="block";
    resultsDiv.innerHTML="<div style=\"background:var(--card-bg);border:1.5px solid var(--wasabi);border-radius:12px;padding:24px;max-width:520px;margin:0 auto;text-align:center\">"
      +"<div style=\"font-size:24px;margin-bottom:12px\">📋</div>"
      +"<div style=\"font-size:16px;font-weight:700;color:var(--white);margin-bottom:6px\">"+(meta.label||q.toUpperCase())+" Report</div>"
      +"<div style=\"font-size:12px;color:var(--mid);margin-bottom:16px\">"+(stats&&stats.pipe?stats.pipe+" · ":"")+(meta.months||"")+"</div>"
      +"<div style=\"background:var(--inf-blue);border:1.5px solid var(--wasabi);border-radius:8px;padding:12px 16px;margin-bottom:16px\">"
      +"<div style=\"font-size:10px;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px\">Paste into a new Claude chat:</div>"
      +"<div style=\"font-size:14px;font-weight:700;color:var(--wasabi);font-family:var(--mono)\">"+trigger+"</div>"
      +"</div>"
      +"<div style=\"display:flex;gap:10px;justify-content:center;flex-wrap:wrap\">"
      +"<button class=\"act-btn\" style=\"padding:8px 16px;font-size:12px\" onclick=\"copyTrigger('"+trigger+"',this)\">📋 Copy Trigger</button>"
      +"<a href=\"https://claude.ai\" target=\"_blank\" class=\"act-btn crm-btn\" style=\"padding:8px 16px;font-size:12px\">Open New Claude Chat ↗</a>"
      +"</div></div>";
  }
  if(btn){btn.disabled=false;btn.classList.remove("loading");var bt=btn.querySelector(".btn-txt");if(bt)bt.textContent="▶ Run "+(meta.label||q.toUpperCase())+" Pipeline Report";}
  if(stat)stat.textContent="Trigger ready — paste into Claude chat";
}
function copyTrigger(trigger,btn){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(trigger).then(function(){if(btn)btn.textContent="✅ Copied!";setTimeout(function(){if(btn)btn.textContent="📋 Copy Trigger";},2000);});
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab){
  ["q1","q2","q3","q4","ae","coach","war"].forEach(function(t){
    var pane=document.getElementById("pane-"+t);
    var tabEl=document.getElementById("tab-"+t);
    if(pane)pane.style.display=(t===tab)?"block":"none";
    if(tabEl)tabEl.classList.toggle("active",t===tab);
  });
}

// ── War Room ──────────────────────────────────────────────────────────────────
var _synth=window.speechSynthesis||null;
var _utt=null;
var _wrSpeechSupported=typeof window.SpeechSynthesisUtterance!=="undefined"&&!!_synth;
function _wrInitCompat(){
  // Run once after DOMContentLoaded — show/hide compat elements based on browser support
  var ok=document.getElementById("wr-compat-ok");
  var note=document.getElementById("wr-compat-note");
  var btn=document.getElementById("wr-play-btn");
  if(!_wrSpeechSupported){
    if(ok)ok.style.display="none";
    if(note)note.style.display="block";
    if(btn){btn.disabled=true;btn.title="Audio not supported in this browser — read the script above";}
  }
}
function playWR(){
  if(!_wrSpeechSupported){
    var s=document.getElementById("wr-status");
    if(s)s.textContent="Audio not supported — read the briefing text above.";
    return;
  }
  stopWR();
  var txt=document.getElementById("wrText").textContent;
  _utt=new SpeechSynthesisUtterance(txt);
  _utt.rate=0.95;_utt.pitch=1;
  _utt.onend=function(){document.getElementById("wr-status").textContent="Briefing complete.";};
  _utt.onerror=function(e){
    var s=document.getElementById("wr-status");
    if(s)s.textContent="Audio error ("+e.error+") — read the briefing text above.";
  };
  _synth.speak(_utt);
  document.getElementById("wr-status").textContent="▶ Playing briefing...";
}
function stopWR(){
  if(_synth)_synth.cancel();
  var s=document.getElementById("wr-status");
  if(s)s.textContent="Stopped.";
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",function(){
 try{
  // Pre-compute NowSell scores and forecast checks
  PIPE_Q1.forEach(function(d){d._ns=d.nowsell||_nowsellScore(d);d._fc=_getForecastCheck(d);});

  // Render all sections
  renderHygiene();
  renderTerrSummary();
  renderPipe();
  renderAtRisk();
  renderUnassigned();
  renderWon();
  renderAE();
  renderCoach();

  // CQ stat card — ⚠️ NNR #51: MUST include UNASSIGNED_DEALS in total (PD #33)
  // PIPE_Q1 contains only assigned deals. UNASSIGNED_DEALS holds blank-AE pipeline
  // (e.g. NAB $5.73M). Summing PIPE_Q1 alone understates territory pipeline by
  // the full unassigned bucket — this is the root cause of the CQ tile showing $2.2M
  // instead of $10M. Always sum ALL deals for the territory headline number.
  var _ua=typeof UNASSIGNED_DEALS!=="undefined"?UNASSIGNED_DEALS:[];
  var _allPipeDeals=PIPE_Q1.concat(_ua);
  var _totalPipe=_allPipeDeals.reduce(function(a,d){return a+(d.nnacv||0);},0);
  var _totalDeals=_allPipeDeals.length;
  var _cqLabel=_QTR_META.q1Label||"CQ";
  var sp=document.getElementById("s-pipe");
  if(sp){sp.textContent=_fmt(_totalPipe);sp.className=_totalPipe<0?"sc-val a":"sc-val";}
  var spSub=document.getElementById("s-pipe-sub");
  if(spSub)spSub.textContent=_totalDeals+" deals · net NNACV · "+_cqLabel;
  var pt=document.getElementById("pipe-section-title");
  if(pt)pt.textContent=_cqLabel+" Open Pipeline — "+_totalDeals+" Deals · Net "+_fmt(_totalPipe)+" · Grouped by Close Month";

  // Header badges from _QTR_META
  var hd=document.getElementById("hdr-days");
  if(hd){
    var eqMap={"Q1":"03-31","Q2":"06-30","Q3":"09-30","Q4":"12-31"};
    var labelMatch=(_cqLabel||"").match(/Q(\d)\s+FY(\d{4})/);
    if(labelMatch){
      var eqKey="Q"+labelMatch[1];var eqYear=labelMatch[2];
      var eqDate=new Date(eqYear+"-"+eqMap[eqKey]);var todayDate=new Date();
      var daysLeft=Math.ceil((eqDate-todayDate)/(1000*60*60*24));
      if(daysLeft>0){hd.textContent=daysLeft+" days to EOQ";hd.className="bdg "+(daysLeft<=14?"red":daysLeft<=30?"amb":"grn");}
      else{hd.textContent=_cqLabel+" closed";hd.className="bdg grn";}
    } else {hd.textContent=_cqLabel;hd.className="bdg amb";}
  }

  // Territory badge
  var terrBadge=document.getElementById("hdr-terr");
  if(terrBadge&&_QTR_META.territory)terrBadge.textContent=_QTR_META.territory;

  // Header sub and meta
  var hdrSub=document.getElementById("hdr-sub");
  if(hdrSub)hdrSub.textContent=(_QTR_META.territory||"Territory")+" | "+_cqLabel+" | NowSell Coaching Dashboard";
  var hdrMeta=document.getElementById("hdr-meta");
  if(hdrMeta){var now=new Date();hdrMeta.textContent="📅 As of "+now.toLocaleDateString("en-AU",{day:"2-digit",month:"short",year:"numeric"})+" | "+_cqLabel;}

  // Tab labels
  var t1=document.getElementById("tab-q1");if(t1)t1.textContent=_cqLabel;
  var aet=document.getElementById("ae-rank-title");if(aet)aet.textContent="AE Stack Rank — "+_cqLabel;
  var ct=document.getElementById("coach-title");if(ct)ct.textContent="Manager Coaching Actions — "+_cqLabel;
  var wrt=document.getElementById("wr-title");if(wrt)wrt.textContent="🎙 War Room Briefing — "+(_QTR_META.territory||"Territory")+" "+_cqLabel;

  // War Room text from data-driven SCRIPT
  var wrEl=document.getElementById("wrText");
  if(wrEl&&typeof SCRIPT!=="undefined"&&SCRIPT.length){
    wrEl.textContent=SCRIPT.map(function(s){return s.text;}).join("\n\n");
  }

  // Forward quarter stat cards
  ["q2","q3","q4"].forEach(function(qk){
    var qs=_QTR_STATS[qk];if(!qs)return;
    var meta=_QTR_META[qk];
    var el=document.getElementById("s-"+qk);
    var sub=document.getElementById("s-"+qk+"-sub");
    var lbl=document.getElementById("sc-lbl-"+qk);
    if(el)el.textContent=(qs.pipe&&qs.pipe!=="—")?qs.pipe:"—";
    if(sub&&meta){var dealTxt=(qs.n&&qs.n!=="—")?(qs.n+" deals · "):"";sub.textContent=dealTxt+"net NNACV · "+(meta.months||"");}
    if(lbl&&meta)lbl.innerHTML=(meta.label||qk.toUpperCase())+" Pipeline <span style=\"color:var(--wasabi);font-size:9px;margin-left:4px\">▶ RUN</span>";
    var tabEl=document.getElementById("tab-"+qk);if(tabEl&&meta)tabEl.textContent=meta.label||qk.toUpperCase();
    var pTitle=document.getElementById(qk+"-prompt-title");if(pTitle&&meta)pTitle.textContent=(meta.label||qk.toUpperCase())+" Pipeline Report";
    var pMeta=document.getElementById(qk+"-prompt-meta");if(pMeta&&meta)pMeta.textContent=meta.months||meta.dates||"";
    var pBtn=document.getElementById("btn-"+qk);if(pBtn&&meta){var bt=pBtn.querySelector(".btn-txt");if(bt)bt.textContent="▶ Run "+(meta.label||qk.toUpperCase())+" Pipeline Report";}
    var pillPipe=document.getElementById(qk+"-pill-pipe");if(pillPipe)pillPipe.textContent=(qs.pipe&&qs.pipe!=="—")?qs.pipe:"—";
    var pillN=document.getElementById(qk+"-pill-n");if(pillN)pillN.textContent=(qs.n&&qs.n!=="—")?qs.n:"—";
  });

  // Quota modal header sub
  var qhs=document.getElementById("quota-hdr-sub");
  if(qhs)qhs.textContent="Set AE quotas to update coverage calculations — "+_cqLabel;

  // War Room browser compatibility check
  _wrInitCompat();

  // Version watermark footer
  var footerGen=document.getElementById("ssc-footer-generated");
  if(footerGen){
    var now=new Date();
    var genStr=now.toLocaleDateString("en-AU",{day:"2-digit",month:"short",year:"numeric"})
      +" "+now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"});
    footerGen.textContent="Generated: "+genStr+" · "+(_QTR_META.territory||"Territory")+" · "+(_QTR_META.q1Label||"CQ");
  }
 }catch(_sscErr){
  // ── ERROR BOUNDARY — never show a blank dashboard ───────────────────────
  // Maps the error to the failure mode table so users can self-diagnose.
  var _errHtml='<div style="background:#1a0a0e;border:2px solid #E8394D;border-radius:12px;padding:32px;margin:24px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;color:#fff">';
  _errHtml+='<h2 style="color:#E8394D;margin-bottom:12px;font-size:18px">Dashboard Error</h2>';
  _errHtml+='<pre style="background:#0a1a22;border:1px solid #1a4a5c;border-radius:8px;padding:16px;font-size:12px;color:#F5A623;overflow-x:auto;white-space:pre-wrap;margin-bottom:16px">'+(_sscErr.message||'Unknown error')+'</pre>';
  _errHtml+='<div style="font-size:12px;color:#8ca0ad;line-height:1.6;margin-bottom:16px">';
  _errHtml+='<strong style="color:#7bcfe8">Quick diagnosis:</strong><br>';
  if(_sscErr.message&&_sscErr.message.indexOf('replace')>=0)_errHtml+='→ Likely cause: <code>ae.n</code> field missing from AE_DATA (NNR #33). Ask your admin to add <code>n</code> field to every AE object.<br>';
  else if(_sscErr.message&&_sscErr.message.indexOf('q1Label')>=0)_errHtml+='→ Likely cause: <code>_QTR_META.q1Label</code> missing (NNR #34). Ask your admin to set q1Label in _QTR_META.<br>';
  else if(_sscErr.message&&_sscErr.message.indexOf('not defined')>=0)_errHtml+='→ Likely cause: A required variable is missing from the Data Swap Zone. Re-run "Build dashboard".<br>';
  else if(_sscErr.message&&_sscErr.message.indexOf('not a function')>=0)_errHtml+='→ Likely cause: A data field has the wrong type (e.g. array instead of integer). Re-run "Build dashboard".<br>';
  else _errHtml+='→ Share this error with your admin — they can cross-reference the failure mode table in SKILL.md.<br>';
  _errHtml+='</div>';
  _errHtml+='<details style="margin-top:8px"><summary style="cursor:pointer;color:#63DF4E;font-size:11px;font-weight:700">Stack trace (for admin)</summary>';
  _errHtml+='<pre style="background:#0a1a22;border:1px solid #1a4a5c;border-radius:8px;padding:12px;font-size:10px;color:#8ca0ad;margin-top:8px;overflow-x:auto;white-space:pre-wrap">'+(_sscErr.stack||'No stack trace available')+'</pre>';
  _errHtml+='</details>';
  _errHtml+='<div style="margin-top:16px;padding:10px 14px;background:rgba(99,223,78,.08);border:1px solid rgba(99,223,78,.25);border-radius:8px;font-size:11px;color:#63DF4E">';
  _errHtml+='To fix: type <strong>"Build dashboard"</strong> in Claude to regenerate. If the error persists, type <strong>"Refresh data"</strong> to re-pull from Snowflake.</div>';
  _errHtml+='</div>';
  document.body.innerHTML=_errHtml;
  console.error('SSC Dashboard Error:', _sscErr);
 }
});

document.addEventListener("DOMContentLoaded",function(){
  var _dm=document.getElementById("dealModal");if(_dm)_dm.addEventListener("click",function(e){if(e.target===this)closeModal();});
  var _hg=document.getElementById("hg-overlay");if(_hg)_hg.addEventListener("click",function(e){if(e.target===this)closeHygieneModal();});
  var _am=document.getElementById("aeModal");if(_am)_am.addEventListener("click",function(e){if(e.target===this)closeAEModal();});
});
</script>
<div class="ssc-footer">
  <span class="ssc-footer-left" id="ssc-footer-generated">Generated: —</span>
  <span class="ssc-footer-right" id="ssc-footer-version">ServiceNow Sales Command Centre · SSC v6.0</span>
</div>
</body>
</html>
