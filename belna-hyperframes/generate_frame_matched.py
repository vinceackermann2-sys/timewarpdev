from pathlib import Path

DURATION = "82.5416666667"
MARK = """<svg viewBox="20 28 62 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="#86A8FF"><path d="M51.5 33.5 L59.3 53 L52 59.1 L50.4 59.1 L43.7 53 Z"/><path d="M42.7 52.9 L50 59.7 L49.2 61.9 L42.5 68.1 L23.8 60.6 Z"/><path d="M60.2 52.9 L79.1 60.5 L60.8 68 L53.3 61.8 L53 59.8 Z"/><path d="M50.2 62.7 L52.7 62.7 L59 68.7 L44 68.7 Z"/></g></svg>"""

CSS = r"""
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#fff;font-family:Inter,Arial,Helvetica,sans-serif;color:#08090b}
#root{position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff}
#source{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover;z-index:0}
.clip{position:absolute;inset:0;z-index:20;pointer-events:none}.mark svg{width:100%;height:100%;display:block}
.cover{background:linear-gradient(#fff 0 28%,#fff 55%,#e8f4ff 100%);display:flex;align-items:center;justify-content:center;text-align:center}
.hero{font-size:92px;line-height:.98;letter-spacing:-.055em;font-weight:520}.hero b{font-weight:650}.subline{font-size:62px;line-height:1.08}.blue{color:#4d8edc}
.tile{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:286px;height:286px;border-radius:62px;background:#fff;box-shadow:0 18px 46px rgba(0,0,0,.17);display:grid;place-items:center}.tile .mark{width:168px;height:126px}
.identity{position:absolute;left:50%;top:18px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}.avatar{width:168px;height:168px;border-radius:50%;background:#fff;box-shadow:0 14px 34px rgba(0,0,0,.12);display:grid;place-items:center}.avatar .mark{width:105px;height:78px}.name{margin-top:-5px;background:#fff;border-radius:0 0 36px 36px;padding:13px 40px 17px;font-size:46px;box-shadow:0 10px 24px rgba(0,0,0,.07)}
.patch{position:absolute;background:#fff}.bubble{position:absolute;border-radius:72px;padding:28px 42px;font-size:48px;line-height:1.12}.user{left:760px;top:420px;background:#cde5fb}.reply{left:-40px;top:555px;background:#eceeef}
.input{position:absolute;left:410px;top:420px;width:1110px;height:142px;border-radius:72px;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.16);display:flex;align-items:center;padding:0 40px;font-size:39px}.input .plus{font-size:68px;margin-right:20px}.input .send{margin-left:auto;width:66px;height:66px;border-radius:50%;background:#d8e9fb;color:#2e77cc;display:grid;place-items:center;font-size:40px}
.mail{position:absolute;left:314px;top:140px;width:1290px;height:835px;background:#e9e9eb;padding:60px 80px}.mail h2{font-size:58px;font-weight:520;margin:0 0 24px}.row{position:relative;background:#fff;border-radius:34px;min-height:164px;margin:0 0 24px;padding:25px 96px 22px 145px}.row.hot{background:#d9ecff}.row .icon{position:absolute;left:24px;top:24px;width:104px;height:104px;border-radius:50%;background:#5c72d8;color:#fff;display:grid;place-items:center;font-weight:750;font-size:29px}.row b{font-size:32px}.row span{display:block;font-size:30px;margin-top:7px}.row small{display:block;font-size:24px;color:#83878e;margin-top:7px}
.email{position:absolute;left:370px;top:105px;width:700px;height:850px;border-radius:26px;background:#d9efff;box-shadow:0 18px 45px rgba(0,0,0,.12);padding:42px 48px}.email .from{font-size:26px;color:#666}.email h3{font-size:41px;margin:14px 0}.email p{font-size:26px;line-height:1.38}
.chip{position:absolute;left:50%;top:112px;transform:translateX(-50%);background:#fff;border-radius:46px;padding:16px 28px 16px 18px;box-shadow:0 14px 34px rgba(0,0,0,.1);display:flex;align-items:center;gap:16px;font-size:29px}.chip .mark{width:62px;height:46px}.msg{position:absolute;left:420px;top:530px;max-width:690px;background:#eceeef;border-radius:38px;padding:26px 32px;font-size:35px}
.approval{position:absolute;left:255px;top:178px;width:1410px;height:720px;border-radius:66px;background:#fff;box-shadow:0 16px 54px rgba(0,0,0,.12);padding:66px}.approval h3{font-size:48px;margin:0 0 10px;font-weight:580}.muted{font-size:27px;color:#74787f}.price{font-size:66px;font-weight:700;margin:64px 0 50px}.buttons{display:flex;gap:25px}.btn{height:128px;flex:1;border-radius:68px;display:grid;place-items:center;font-size:48px;font-weight:680}.deny{background:#edf0f2}.allow{background:#2478d6;color:#fff}
.done{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:440px;height:410px;border-radius:62px;background:linear-gradient(#fff,#edf7ff);display:flex;flex-direction:column;align-items:center;justify-content:center}.done .mark{width:135px;height:102px}.done b{font-size:68px;margin-top:20px}
.mini{position:absolute;left:50%;top:125px;transform:translateX(-50%);background:#fff;border-radius:42px;padding:14px 25px;box-shadow:0 12px 30px rgba(0,0,0,.1);display:flex;align-items:center;gap:13px;font-size:27px}.mini .mark{width:48px;height:36px}
.browserbar{position:absolute;left:0;bottom:0;width:1600px;height:150px;border-radius:0 78px 0 0;background:#2478d6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:58px}
.signup{position:absolute;left:1160px;top:395px;background:#eceeef;border-radius:55px;padding:28px 40px;font-size:43px}
.mascotMask{position:absolute;left:1080px;top:250px;width:550px;height:560px;background:#fff;border-radius:210px}.celebrate{position:absolute;left:1230px;top:410px;width:260px;height:195px}
.flight{position:absolute;left:140px;top:20px;width:1430px;height:575px}.delay{height:108px;border-radius:62px 62px 0 0;background:#e50046;color:#fff;font-size:51px;font-weight:700;display:grid;place-items:center}.flightbody{height:465px;background:#f0f0f2;border-radius:0 0 104px 104px;position:relative}.flight .from,.flight .to{position:absolute;top:70px;font-size:98px;font-weight:700}.flight .from{left:60px}.flight .to{right:76px}.dur{position:absolute;left:50%;top:105px;transform:translateX(-50%);font-size:40px}.when{position:absolute;left:60px;bottom:64px;font-size:38px;font-weight:700}.arrive{position:absolute;right:72px;bottom:64px;font-size:38px;font-weight:700}
.question{position:absolute;left:-40px;top:455px;width:1510px;height:285px;background:#eceeef;border-radius:110px;display:grid;place-items:center;font-size:70px}.yes{position:absolute;left:650px;top:600px;width:1030px;height:310px;background:#cde5fb;border-radius:112px;display:grid;place-items:center;font-size:85px}
.payoff{background:linear-gradient(#fff 0 28%,#fff 58%,#e8f4ff 100%);display:grid;place-items:center;text-align:center}.payoff .hero{font-size:112px}
.integrations{background:#fff}.app{position:absolute;border-radius:50%;background:#fff;border:10px solid var(--c);box-shadow:0 8px 20px rgba(0,0,0,.09);display:grid;place-items:center;color:var(--c);font-weight:800}.app span{font-size:50px}.app b{position:absolute;left:10px;right:10px;bottom:12px;font-size:16px;line-height:1.05;color:#111;white-space:normal;text-align:center}.a1{left:470px;top:500px;width:210px;height:210px}.a2{left:820px;top:150px;width:150px;height:150px}.a3{left:1080px;top:205px;width:150px;height:150px}.a4{left:1240px;top:620px;width:150px;height:150px}.a5{left:730px;top:720px;width:190px;height:190px}.a6{left:1015px;top:745px;width:145px;height:145px}.pill{position:absolute;left:735px;top:475px;width:510px;height:108px;border-radius:56px;background:#eceff4;display:flex;align-items:center;padding:0 24px;gap:18px;font-size:28px}.check{width:62px;height:62px;border:7px solid #2478d6;border-radius:50%;display:grid;place-items:center;color:#2478d6;font-size:34px}
.its{position:absolute;left:675px;top:405px;width:650px;height:255px;background:#fff;display:grid;place-items:center;font-size:68px;font-weight:580}
.end{background:#050506;color:#fff;display:grid;place-items:center;text-align:center}.end .tile2{width:220px;height:220px;border-radius:48px;background:#fff;display:grid;place-items:center;margin:auto}.end .tile2 .mark{width:138px;height:104px}.end .word{font-size:64px;font-weight:650;letter-spacing:.16em;margin-top:22px}.end .tag{font-size:24px;margin-top:16px}.end .url{font-size:20px;margin-top:8px;opacity:.66}
"""

def clip(i,start,dur,inner,cls=""):
    return f'<section id="{i}" class="clip {cls}" data-start="{start}" data-duration="{dur}" data-track-index="1">{inner}</section>'

def mark(cls="mark"):
    return f'<div class="{cls}">{MARK}</div>'

def build(lang):
    sv = lang == "sv"
    intro = "Vi presenterar<br><span class='blue'>Belna</span>" if sv else "Introducing<br><span class='blue'>Belna</span>"
    personal = "Din personliga<br><b>AI-agent</b>" if sv else "Your personal<br><b>AI agent</b>"
    newkind = "En ny<br>sorts AI" if sv else "A new<br>kind of AI"
    user = "Den här veckan har varit kaos." if sv else "This week has been hectic."
    reply = "Vad kan jag ta från din lista?" if sv else "What can I take off your plate?"
    input_text = "Hjälp mig hålla koll på skolmejl" if sv else "Help me stay on top of school emails"
    source1, source2, source3 = (("SchoolSoft","Vklass","Svenska Lag") if sv else ("Mail","Calendar","Activities"))
    email_title = "Materiallista uppdaterad" if sv else "School supplies list updated"
    email_body = ("Belna har plockat ut det viktiga inför nästa vecka.<br><br>• Anteckningsbok<br>• Pennor<br>• Idrottskläder<br>• Tillstånd senast fredag"
                  if sv else "Belna pulled out the important items for next week.<br><br>• Notebook<br>• Pens<br>• Sports clothes<br>• Permission form due Friday")
    work_msg = "Jag hittade det som behöver ordnas utifrån skolinformationen." if sv else "I found what needs to be handled from the school updates."
    approval_title = "Belna väntar på ditt godkännande" if sv else "Belna is waiting for your approval"
    approval_sub = "Jag har byggt veckans matkorg." if sv else "I built this week's grocery basket."
    price = "547 kr" if sv else "$54.70"
    deny, allow = ("Neka","Godkänn") if sv else ("Deny","Allow")
    done = "Klart!" if sv else "Done!"
    title1 = "AI som<br><span class='subline'>🛒 handlar</span><br>åt dig" if sv else "AI that<br><span class='subline'>🛒 shops</span><br>for you"
    title2 = "AI som<br><span class='subline'>📘 svarar</span><br>åt dig" if sv else "AI that<br><span class='subline'>📘 drafts replies</span><br>for you"
    browser = "Belna tar hand om webbläsaren" if sv else "Belna is taking control of the browser"
    signed = "Du är anmäld." if sv else "You're in."
    goals = "AI som<br><span class='subline'>🎯 håller koll på dina mål</span><br>åt dig" if sv else "AI that<br><span class='subline'>🎯 tracks your goals</span><br>for you"
    plans = "AI som<br><span class='subline'>🏃 bygger planer</span><br>åt dig" if sv else "AI that<br><span class='subline'>🏃 builds plans</span><br>for you"
    travel_msg = "Ditt flyg är försenat. Jag kollar alternativ och kalendern." if sv else "Your flight is delayed. I'm checking alternatives and your calendar."
    airports = ("ARN","GOT") if sv else ("JFK","SFO")
    question = "Vill du att jag ändrar din resa?" if sv else "Would you like me to change your trip?"
    yes = "Ja, tack! 👍" if sv else "Yes, please! 👍"
    payoff = "Din Belna<br>får det gjort" if sv else "Your Belna<br>gets it done"
    rapid = [
      ("AI som<br><span class='subline'>✈️ bokar resor</span><br>åt dig","AI that<br><span class='subline'>✈️ books trips</span><br>for you"),
      ("AI som<br><span class='subline'>🎁 skickar gåvan</span><br>åt dig","AI that<br><span class='subline'>🎁 sends the gift</span><br>for you"),
      ("AI som<br><span class='subline'>🐷 sparar pengar</span><br>åt dig","AI that<br><span class='subline'>🐷 saves money</span><br>for you"),
    ]
    apps = [("S","SchoolSoft","#5c72d8"),("V","Vklass","#86a8ff"),("SL","Svenska Lag","#16213b"),("I","ICA","#e05062"),("M","Mathem","#61a76d"),("T","Tibber","#7768d8")] if sv else [("M","Mail","#5c72d8"),("C","Calendar","#86a8ff"),("Map","Maps","#16213b"),("S","Shopping","#e05062"),("G","Groceries","#61a76d"),("T","Travel","#7768d8")]
    app_html = "".join(f"<div class='app a{n}' style='--c:{c}'><span>{x}</span><b>{label}</b></div>" for n,(x,label,c) in enumerate(apps,1))
    last1 = "AI som<br><span class='subline'>håller dig uppdaterad</span>" if sv else "AI that<br><span class='subline'>keeps you up-to-date</span>"
    last2 = "AI som<br><span class='subline'>håller dig i loopen</span>" if sv else "AI that<br><span class='subline'>keeps you in the loop</span>"
    last3 = "AI som<br><span class='subline'>låter dig ha kontroll</span>" if sv else "AI that<br><span class='subline'>keeps you in control</span>"
    its = "Det är din Belna" if sv else "It's your Belna"
    endtag = "Din personliga AI-agent" if sv else "Your personal AI agent"

    scenes = []
    scenes.append(clip("opening","0","1.55",f"<div class='tile'>{mark()}</div>"))
    scenes.append(clip("intro","3.0","2.0",f"<div class='hero'>{intro}</div>","cover"))
    scenes.append(clip("personal","5.0","4.4",f"<div class='hero'>{personal}<div style='width:120px;margin:42px auto 0'>{MARK}</div></div>","cover"))
    scenes.append(clip("newkind","9.4","1.4",f"<div class='hero'>{newkind}</div>","cover"))
    scenes.append(clip("chat","10.8","3.8",f"<div class='identity'><div class='avatar'>{mark()}</div><div class='name'>Belna</div></div><div class='bubble user'>{user}</div><div class='bubble reply'>{reply}</div>"))
    scenes.append(clip("input","14.6","2.9",f"<div class='input'><span class='plus'>+</span><span>{input_text}</span><span class='send'>↑</span></div>"))
    rows = f"<div class='row'><div class='icon'>{source1[:2]}</div><b>{source1}</b><span>{'Veckans information' if sv else 'Weekly update'}</span><small>{'Det finns nya saker att se över…' if sv else 'There are new items to review…'}</small></div><div class='row hot'><div class='icon'>{source2[:2]}</div><b>{source2}</b><span>{'Veckans uppgifter har uppdaterats' if sv else 'This week changed'}</span><small>{'Två saker behöver din uppmärksamhet…' if sv else 'Two items need your attention…'}</small></div><div class='row'><div class='icon'>{source3[:2]}</div><b>{source3}</b><span>{'En aktivitet har ändrats' if sv else 'An activity changed'}</span><small>{'Ny tid finns i kalendern…' if sv else 'New time is in the calendar…'}</small></div>"
    scenes.append(clip("mail","17.5","2.3",f"<div class='mail'><h2>{'Inkorg' if sv else 'Inbox'}</h2>{rows}</div>"))
    scenes.append(clip("email","19.8","1.7",f"<div class='email'><div class='from'>{source1} · {'idag' if sv else 'today'}</div><h3>{email_title}</h3><p>{email_body}</p></div>"))
    scenes.append(clip("working","21.5","3.5",f"<div class='chip'>{mark()}<b>Belna</b></div><div class='msg'>{work_msg}</div>"))
    scenes.append(clip("order","25.0","2.58",f"<div class='chip'>{mark()}<b>{'Belna skapar beställningen' if sv else 'Belna is preparing the order'}</b></div>"))
    scenes.append(clip("approval","27.58","1.92",f"<div class='approval'><h3>{approval_title}</h3><div class='muted'>{approval_sub}</div><div class='price'>{price}</div><div class='buttons'><div class='btn deny'>{deny}</div><div class='btn allow'>{allow}</div></div></div>"))
    scenes.append(clip("done","29.5","2.17",f"<div class='done'>{mark()}<b>{done}</b></div>"))
    scenes.append(clip("title1","31.67","1.62",f"<div class='hero'>{title1}</div>","cover"))
    scenes.append(clip("title2","33.29","1.45",f"<div class='hero'>{title2}</div>","cover"))
    scenes.append(clip("health","34.74","3.46",f"<div class='mini'>{mark()}<b>Belna</b></div>"))
    scenes.append(clip("goal","38.2","2.9",f"<div class='mini'>{mark()}<b>Belna</b></div><div class='msg'>{'Du gör bra framsteg. Jag hittade något som passar din vecka.' if sv else 'You are making good progress. I found something that fits your week.'}</div>"))
    scenes.append(clip("browser","41.1","4.7",f"<div class='browserbar'>{browser}</div>"))
    scenes.append(clip("signup","45.8","1.0",f"<div class='mini'>{mark()}<b>Belna</b></div><div class='signup'>{signed}</div>"))
    scenes.append(clip("celebrate","46.8","1.95",f"<div class='mascotMask'></div><div class='celebrate'>{MARK}</div>"))
    scenes.append(clip("goals","48.75","2.35",f"<div class='hero'>{goals}</div>","cover"))
    scenes.append(clip("plans","51.1","2.0",f"<div class='hero'>{plans}</div>","cover"))
    scenes.append(clip("travel","53.1","5.8",f"<div class='mini'>{mark()}<b>Belna</b></div><div class='msg'>{travel_msg}</div>"))
    scenes.append(clip("flight","58.9","1.65",f"<div class='flight'><div class='delay'>{'Försenat' if sv else 'Delayed'}</div><div class='flightbody'><div class='from'>{airports[0]}</div><div class='dur'>1h 05m</div><div class='to'>{airports[1]}</div><div class='when'>23 SEP · 14:15</div><div class='arrive'>15:20</div></div></div>"))
    scenes.append(clip("question","60.55","2.07",f"<div class='question'>{question}</div>"))
    scenes.append(clip("yes","62.62","1.96",f"<div class='yes'>{yes}</div>"))
    scenes.append(clip("calendar","64.58","3.72",f"<div class='mini' style='top:270px'>{mark()}<b>Belna</b></div>"))
    scenes.append(clip("payoff","68.3","1.7",f"<div class='hero'>{payoff}</div>","payoff"))
    scenes.append(clip("rapid1","70.0","1.2",f"<div class='hero'>{rapid[0][0 if sv else 1]}</div>","cover"))
    scenes.append(clip("rapid2","71.2",".95",f"<div class='hero'>{rapid[1][0 if sv else 1]}</div>","cover"))
    scenes.append(clip("rapid3","72.15","1.1",f"<div class='hero'>{rapid[2][0 if sv else 1]}</div>","cover"))
    scenes.append(clip("integrations","73.25","3.65",f"<div>{app_html}<div class='pill'><div class='check'>✓</div><b>{'Allt på ett ställe' if sv else 'All in one place'}</b></div></div>","integrations"))
    scenes.append(clip("its","76.9","1.9",f"<div class='its'>{its}</div>"))
    scenes.append(clip("last1","78.8",".85",f"<div class='hero'>{last1}</div>","cover"))
    scenes.append(clip("last2","79.65",".9",f"<div class='hero'>{last2}</div>","cover"))
    scenes.append(clip("last3","80.55","1.12",f"<div class='hero'>{last3}<div style='width:130px;margin:30px auto 0'>{MARK}</div></div>","cover"))
    scenes.append(clip("end","81.67",".8716666667",f"<div><div class='tile2'>{mark()}</div><div class='word'>BELNA</div><div class='tag'>{endtag}</div><div class='url'>belna.se</div></div>","end"))

    comp = "belna-sv" if sv else "belna-en"
    js = f"""
window.__timelines=window.__timelines||{{}};
const tl=gsap.timeline({{paused:true,defaults:{{ease:'power3.out'}}}});
tl.fromTo('#opening .tile',{{opacity:0,scale:.82}},{{opacity:1,scale:1,duration:.3}},.02).to('#opening .tile',{{opacity:0,scale:.72,duration:.28}},1.18);
tl.fromTo('#intro .hero',{{opacity:0,y:32}},{{opacity:1,y:0,duration:.35}},3.08);
tl.fromTo('#personal .hero',{{opacity:0,scale:.74}},{{opacity:1,scale:1,duration:.42}},5.05).to('#personal .hero',{{scale:1.34,duration:3.6,ease:'power1.in'}},5.55);
tl.fromTo('#chat .identity',{{opacity:0,y:-30,scale:.9}},{{opacity:1,y:0,scale:1,duration:.34}},10.88);
tl.fromTo('#chat .user',{{opacity:0,y:24}},{{opacity:1,y:0,duration:.3}},11.7);
tl.fromTo('#chat .reply',{{opacity:0,x:-30}},{{opacity:1,x:0,duration:.3}},13.12);
tl.fromTo('#input .input',{{opacity:0,scale:.75}},{{opacity:1,scale:1,duration:.34}},14.7);
tl.fromTo('#mail .row',{{opacity:0,y:28}},{{opacity:1,y:0,duration:.26,stagger:.08}},17.62);
tl.fromTo('#email .email',{{opacity:0,scale:.9,y:24}},{{opacity:1,scale:1,y:0,duration:.3}},19.88);
tl.fromTo('#working .chip,#working .msg',{{opacity:0,y:20}},{{opacity:1,y:0,duration:.28,stagger:.08}},21.58);
tl.fromTo('#approval .approval',{{opacity:0,scale:.94}},{{opacity:1,scale:1,duration:.25}},27.62);
tl.fromTo('#done .done',{{opacity:0,scale:.78}},{{opacity:1,scale:1,duration:.28,ease:'back.out(1.6)'}},29.55);
tl.fromTo('#browser .browserbar',{{y:155}},{{y:0,duration:.3}},41.18);
tl.fromTo('#celebrate .celebrate',{{opacity:0,scale:.7}},{{opacity:1,scale:1,duration:.22}},46.85);
tl.fromTo('#flight .flight',{{opacity:0,scale:.9,y:-25}},{{opacity:1,scale:1,y:0,duration:.3}},58.95);
tl.fromTo('#question .question',{{opacity:0,x:-80}},{{opacity:1,x:0,duration:.3}},60.64);
tl.fromTo('#yes .yes',{{opacity:0,scale:.9,y:40}},{{opacity:1,scale:1,y:0,duration:.3}},62.7);
tl.fromTo('#integrations .app',{{opacity:0,scale:.2}},{{opacity:1,scale:1,duration:.32,stagger:.06,ease:'back.out(1.5)'}},73.31);
tl.fromTo('#integrations .pill',{{opacity:0,scale:.7,x:80}},{{opacity:1,scale:1,x:0,duration:.38}},74.0);
tl.fromTo('#end>div',{{opacity:0,scale:.82}},{{opacity:1,scale:1,duration:.22}},81.69);
window.__timelines['{comp}']=tl;tl.seek(0);
"""
    html = f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Belna frame-matched {lang.upper()}</title><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><style>{CSS}</style></head><body><div id="root" data-composition-id="{comp}" data-start="0" data-duration="{DURATION}" data-fps="24" data-width="1920" data-height="1080"><video id="source" class="clip" src="./assets/reference.mp4" data-start="0" data-duration="{DURATION}" data-track-index="0" muted playsinline preload="auto"></video>{''.join(scenes)}</div><script>{js}</script></body></html>"""
    return html

root = Path(__file__).resolve().parent
for lang in ("sv","en"):
    out = root / lang / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(lang), encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes)")
