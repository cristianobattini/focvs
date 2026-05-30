import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Dimensions, StatusBar, Platform, Vibration, Animated,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// ─── THEME ────────────────────────────────────────────────
const C = {
  bg:       '#080808',
  surface:  '#111111',
  surface2: '#181818',
  border:   '#1f1f1f',
  accent:   '#e2dbd0',
  gold:     '#c8a96e',
  goldDim:  'rgba(200,169,110,0.12)',
  muted:    '#333333',
  textDim:  '#4a4845',
  text:     '#ccc8c0',
  green:    '#7ab87a',
  red:      '#c85c5c',
};

const { width: W } = Dimensions.get('window');

// ─── SOUNDS ───────────────────────────────────────────────
const SOUNDS = [
  { id: 'rain',     name: 'Rain',       icon: '🌧️', desc: 'pioggia su vetro' },
  { id: 'brown',    name: 'Brown Noise',icon: '🟫', desc: 'rumore marrone' },
  { id: 'white',    name: 'White Noise',icon: '⬜', desc: 'mascheramento totale' },
  { id: 'cafe',     name: 'Café',       icon: '☕', desc: 'chiacchiericcio' },
  { id: 'forest',   name: 'Foresta',    icon: '🌲', desc: 'vento tra alberi' },
  { id: 'fire',     name: 'Fuoco',      icon: '🔥', desc: 'crepitio camino' },
  { id: 'ocean',    name: 'Oceano',     icon: '🌊', desc: 'onde ritmiche' },
  { id: 'keyboard', name: 'Tastiera',   icon: '⌨️', desc: 'ufficio lontano' },
];

const BINAURALS = [
  { id: 'off',   name: 'OFF',   hz: 0,  sub: 'disattivo',             base: 0 },
  { id: 'delta', name: 'Delta', hz: 2,  sub: '1–4 Hz · sonno profondo', base: 100 },
  { id: 'theta', name: 'Theta', hz: 6,  sub: '4–8 Hz · meditazione',    base: 120 },
  { id: 'alpha', name: 'Alpha', hz: 10, sub: '8–12 Hz · relax focus',   base: 200 },
  { id: 'beta',  name: 'Beta',  hz: 18, sub: '12–30 Hz · concentrazione',base: 300 },
  { id: 'gamma', name: 'Gamma', hz: 40, sub: '30–100 Hz · insight',     base: 400 },
];

const PRESETS = [
  { label: '25m', min: 25 },
  { label: '45m', min: 45 },
  { label: '60m', min: 60 },
  { label: '90m', min: 90 },
  { label: '∞',   min: -1 },
];

// ─── AUDIO HTML ───────────────────────────────────────────
const AUDIO_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script>
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const master = ctx.createGain();
master.gain.value = 0.7;
master.connect(ctx.destination);
const channels = {};
const binNodes = { left:null, right:null };

function pinkFill(d) {
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<d.length;i++){
    const w=Math.random()*2-1;
    b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
    b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
    b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
    d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)/7; b6=w*0.115926;
  }
}
function brownFill(d) {
  let lv=0;
  for(let i=0;i<d.length;i++){const w=Math.random()*2-1;lv=(lv+0.02*w)/1.02;d[i]=lv*3.5;}
}
function noiseBuf(secs, fill, stereo) {
  const ch=stereo?2:1;
  const buf=ctx.createBuffer(ch,Math.floor(ctx.sampleRate*secs),ctx.sampleRate);
  for(let c=0;c<ch;c++) fill(buf.getChannelData(c));
  return buf;
}

function startSound(id, vol) {
  if(channels[id]) return;
  const fadeG=ctx.createGain();
  fadeG.gain.setValueAtTime(0,ctx.currentTime);
  fadeG.gain.linearRampToValueAtTime(1,ctx.currentTime+1.5);
  fadeG.connect(master);
  const volG=ctx.createGain();
  volG.gain.value=vol||0.5;
  volG.connect(fadeG);
  let stopped=false;
  const srcs=[];

  if(id==='rain'){
    // Three layers: high-frequency hiss + low rumble + mid patter
    const s1=ctx.createBufferSource(); s1.buffer=noiseBuf(4,d=>{for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1},true); s1.loop=true;
    const hp1=ctx.createBiquadFilter(); hp1.type='highpass'; hp1.frequency.value=900;
    const lp1=ctx.createBiquadFilter(); lp1.type='lowpass'; lp1.frequency.value=4200;
    const g1=ctx.createGain(); g1.gain.value=0.27;
    s1.connect(hp1).connect(lp1).connect(g1).connect(volG);

    const s2=ctx.createBufferSource(); s2.buffer=noiseBuf(6,brownFill,true); s2.loop=true;
    const lp2=ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=220;
    const g2=ctx.createGain(); g2.gain.value=0.17;
    s2.connect(lp2).connect(g2).connect(volG);

    const s3=ctx.createBufferSource(); s3.buffer=noiseBuf(7,pinkFill,true); s3.loop=true;
    const bp3=ctx.createBiquadFilter(); bp3.type='bandpass'; bp3.frequency.value=1100; bp3.Q.value=0.55;
    const g3=ctx.createGain(); g3.gain.value=0.19;
    s3.connect(bp3).connect(g3).connect(volG);

    // Slow gust envelope on the hiss layer
    const lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.045;
    const lg=ctx.createGain(); lg.gain.value=0.07;
    lfo.connect(lg).connect(g1.gain);
    lfo.start(); s1.start(); s2.start(); s3.start();
    srcs.push(s1,s2,s3,lfo);

  } else if(id==='brown'){
    // Warm stereo brown noise with gentle high-shelf cut
    const s=ctx.createBufferSource(); s.buffer=noiseBuf(7,brownFill,true); s.loop=true;
    const shelf=ctx.createBiquadFilter(); shelf.type='highshelf'; shelf.frequency.value=3500; shelf.gain.value=-9;
    s.connect(shelf).connect(volG); s.start(); srcs.push(s);

  } else if(id==='white'){
    // Pink noise (same perceptual "white" but far less ear-fatiguing)
    const s=ctx.createBufferSource(); s.buffer=noiseBuf(6,pinkFill,true); s.loop=true;
    const g=ctx.createGain(); g.gain.value=0.55;
    s.connect(g).connect(volG); s.start(); srcs.push(s);

  } else if(id==='cafe'){
    // Layered voice murmur bands + espresso-machine hum + cup clinks
    [{freq:240,Q:2.8,rate:0.55,vol:0.17},{freq:380,Q:2.5,rate:0.38,vol:0.16},
     {freq:560,Q:2.2,rate:0.72,vol:0.14},{freq:850,Q:1.9,rate:0.48,vol:0.12},
     {freq:1300,Q:2.6,rate:0.9,vol:0.08},{freq:2100,Q:3.2,rate:0.32,vol:0.05}
    ].forEach(({freq,Q,rate,vol})=>{
      const buf=noiseBuf(3+Math.random()*2,pinkFill);
      const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true;
      const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq; bp.Q.value=Q;
      const lfo=ctx.createOscillator(); lfo.frequency.value=rate+Math.random()*0.3;
      const lg=ctx.createGain(); lg.gain.value=vol*1.2;
      const sg=ctx.createGain(); sg.gain.value=vol;
      lfo.connect(lg).connect(sg.gain); lfo.start();
      s.connect(bp).connect(sg).connect(volG);
      s.start(ctx.currentTime+Math.random()*0.4);
      srcs.push(s,lfo);
    });
    const hum=ctx.createOscillator(); hum.frequency.value=185; hum.type='sawtooth';
    const humG=ctx.createGain(); humG.gain.value=0.007;
    const humLp=ctx.createBiquadFilter(); humLp.type='lowpass'; humLp.frequency.value=380;
    hum.connect(humLp).connect(humG).connect(volG); hum.start(); srcs.push(hum);
    const clink=()=>{
      if(stopped) return;
      const o=ctx.createOscillator(); const g=ctx.createGain();
      const f=1900+Math.random()*1200;
      o.frequency.setValueAtTime(f,ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f*0.72,ctx.currentTime+0.09);
      o.type='sine';
      g.gain.setValueAtTime(0,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.065,ctx.currentTime+0.003);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.45);
      o.connect(g).connect(volG); o.start(); o.stop(ctx.currentTime+0.55);
      setTimeout(clink,9000+Math.random()*18000);
    };
    setTimeout(clink,4000+Math.random()*7000);

  } else if(id==='forest'){
    // Wind base (pink noise, dual LFO for gusts)
    const wBuf=noiseBuf(8,pinkFill,true);
    const ws=ctx.createBufferSource(); ws.buffer=wBuf; ws.loop=true;
    const wLp=ctx.createBiquadFilter(); wLp.type='lowpass'; wLp.frequency.value=680;
    const lfo1=ctx.createOscillator(); lfo1.type='sine'; lfo1.frequency.value=0.038;
    const lg1=ctx.createGain(); lg1.gain.value=0.06;
    const lfo2=ctx.createOscillator(); lfo2.type='sine'; lfo2.frequency.value=0.16;
    const lg2=ctx.createGain(); lg2.gain.value=0.03;
    const windG=ctx.createGain(); windG.gain.value=0.18;
    lfo1.connect(lg1).connect(windG.gain); lfo2.connect(lg2).connect(windG.gain);
    lfo1.start(); lfo2.start();
    ws.connect(wLp).connect(windG).connect(volG); ws.start();
    srcs.push(ws,lfo1,lfo2);

    // Leaf rustle (higher-frequency layer, fast LFO)
    const lBuf=noiseBuf(5,pinkFill,true);
    const ls=ctx.createBufferSource(); ls.buffer=lBuf; ls.loop=true;
    const lHp=ctx.createBiquadFilter(); lHp.type='highpass'; lHp.frequency.value=1600;
    const lLp=ctx.createBiquadFilter(); lLp.type='lowpass'; lLp.frequency.value=5500;
    const lfo3=ctx.createOscillator(); lfo3.type='sine'; lfo3.frequency.value=0.65;
    const lg3=ctx.createGain(); lg3.gain.value=0.07;
    const leafG=ctx.createGain(); leafG.gain.value=0.16;
    lfo3.connect(lg3).connect(leafG.gain); lfo3.start();
    ls.connect(lHp).connect(lLp).connect(leafG).connect(volG); ls.start();
    srcs.push(ls,lfo3);

    // Rich bird calls: chirp, double-chirp, or FM warble
    const bird=()=>{
      if(stopped) return;
      const species=Math.random();
      if(species<0.45){
        // Single rising chirp
        const o=ctx.createOscillator(); const g=ctx.createGain();
        const bf=2100+Math.random()*2200; o.type='sine';
        o.frequency.setValueAtTime(bf,ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(bf*(1.25+Math.random()*0.35),ctx.currentTime+0.07);
        o.frequency.exponentialRampToValueAtTime(bf*0.92,ctx.currentTime+0.14);
        g.gain.setValueAtTime(0,ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.052,ctx.currentTime+0.01);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.22);
        o.connect(g).connect(volG); o.start(); o.stop(ctx.currentTime+0.28);
      } else if(species<0.75){
        // Double chirp
        for(let i=0;i<2;i++){
          const dl=i*0.2;
          const o=ctx.createOscillator(); const g=ctx.createGain();
          const f=2700+Math.random()*1600; o.type='sine';
          o.frequency.setValueAtTime(f,ctx.currentTime+dl);
          o.frequency.exponentialRampToValueAtTime(f*1.18,ctx.currentTime+dl+0.08);
          g.gain.setValueAtTime(0,ctx.currentTime+dl);
          g.gain.linearRampToValueAtTime(0.048,ctx.currentTime+dl+0.012);
          g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dl+0.17);
          o.connect(g).connect(volG); o.start(ctx.currentTime+dl); o.stop(ctx.currentTime+dl+0.22);
        }
      } else {
        // FM warble (vibrato)
        const carrier=ctx.createOscillator(); const cg=ctx.createGain();
        const mod=ctx.createOscillator(); const mg=ctx.createGain();
        const bf=1700+Math.random()*1100; carrier.frequency.value=bf; carrier.type='sine';
        mod.frequency.value=9+Math.random()*7; mg.gain.value=70+Math.random()*55;
        mod.connect(mg).connect(carrier.frequency);
        const dur=0.35+Math.random()*0.35;
        cg.gain.setValueAtTime(0,ctx.currentTime);
        cg.gain.linearRampToValueAtTime(0.05,ctx.currentTime+0.025);
        cg.gain.setValueAtTime(0.05,ctx.currentTime+dur);
        cg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur+0.12);
        carrier.connect(cg).connect(volG);
        mod.start(); carrier.start(); mod.stop(ctx.currentTime+dur+0.2); carrier.stop(ctx.currentTime+dur+0.2);
        srcs.push(carrier,mod);
      }
      setTimeout(bird,2200+Math.random()*6500);
    };
    setTimeout(bird,900);

  } else if(id==='fire'){
    // Deep fire body: brown noise + dual breathing LFO
    const s=ctx.createBufferSource(); s.buffer=noiseBuf(7,brownFill,true); s.loop=true;
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=950;
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=55;
    const lfo1=ctx.createOscillator(); lfo1.type='sine'; lfo1.frequency.value=0.09;
    const lg1=ctx.createGain(); lg1.gain.value=0.04;
    const lfo2=ctx.createOscillator(); lfo2.type='sine'; lfo2.frequency.value=0.21;
    const lg2=ctx.createGain(); lg2.gain.value=0.02;
    const fireG=ctx.createGain(); fireG.gain.value=0.25;
    lfo1.connect(lg1).connect(fireG.gain); lfo2.connect(lg2).connect(fireG.gain);
    lfo1.start(); lfo2.start();
    s.connect(lp).connect(hp).connect(fireG).connect(volG); s.start();
    srcs.push(s,lfo1,lfo2);

    // Crackles: three sizes — hiss, crackle, pop
    const crackle=()=>{
      if(stopped) return;
      const r=Math.random();
      let dur, gainVal, lpF, hpF, nextMs;
      if(r<0.62){
        dur=0.01+Math.random()*0.035; gainVal=0.16+Math.random()*0.2; lpF=4000+Math.random()*3000; hpF=220+Math.random()*380; nextMs=35+Math.random()*140;
      } else if(r<0.92){
        dur=0.035+Math.random()*0.055; gainVal=0.22+Math.random()*0.28; lpF=2200+Math.random()*1800; hpF=100+Math.random()*180; nextMs=90+Math.random()*380;
      } else {
        dur=0.08+Math.random()*0.1; gainVal=0.38+Math.random()*0.32; lpF=1400; hpF=55; nextMs=700+Math.random()*2200;
      }
      const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*dur),ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*(0.12+Math.random()*0.18)));
      const ns=ctx.createBufferSource(); ns.buffer=buf;
      const g=ctx.createGain(); g.gain.value=gainVal;
      const lpf=ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=lpF;
      const hpf=ctx.createBiquadFilter(); hpf.type='highpass'; hpf.frequency.value=hpF;
      ns.connect(hpf).connect(lpf).connect(g).connect(volG); ns.start();
      setTimeout(crackle,nextMs);
    };
    crackle();

  } else if(id==='ocean'){
    // Pink-noise body shaped for ocean spectrum
    const baseBuf=noiseBuf(10,pinkFill,true);
    const baseS=ctx.createBufferSource(); baseS.buffer=baseBuf; baseS.loop=true;
    const baseLp=ctx.createBiquadFilter(); baseLp.type='lowpass'; baseLp.frequency.value=500; baseLp.Q.value=0.45;
    const baseHp=ctx.createBiquadFilter(); baseHp.type='highpass'; baseHp.frequency.value=75;
    const baseG=ctx.createGain(); baseG.gain.value=0.55;

    // Three overlapping wave LFOs at slightly different rates → natural beat
    const lfo1=ctx.createOscillator(); lfo1.type='sine'; lfo1.frequency.value=0.085;
    const lg1=ctx.createGain(); lg1.gain.value=0.28;
    const lfo2=ctx.createOscillator(); lfo2.type='sine'; lfo2.frequency.value=0.13;
    const lg2=ctx.createGain(); lg2.gain.value=0.15;
    const lfo3=ctx.createOscillator(); lfo3.type='sine'; lfo3.frequency.value=0.027;
    const lg3=ctx.createGain(); lg3.gain.value=0.10;
    lfo1.connect(lg1).connect(baseG.gain); lfo2.connect(lg2).connect(baseG.gain); lfo3.connect(lg3).connect(baseG.gain);
    lfo1.start(); lfo2.start(); lfo3.start();
    baseS.connect(baseLp).connect(baseHp).connect(baseG).connect(volG);
    baseS.start(); srcs.push(baseS,lfo1,lfo2,lfo3);

  } else if(id==='keyboard'){
    // Quiet room tone
    const roomBuf=noiseBuf(4,pinkFill);
    const roomS=ctx.createBufferSource(); roomS.buffer=roomBuf; roomS.loop=true;
    const roomLp=ctx.createBiquadFilter(); roomLp.type='lowpass'; roomLp.frequency.value=280;
    const roomG=ctx.createGain(); roomG.gain.value=0.035;
    roomS.connect(roomLp).connect(roomG).connect(volG); roomS.start(); srcs.push(roomS);

    const click=()=>{
      if(stopped) return;
      const r=Math.random();
      let dur, gainVal, hpF, lpF, nextMs;
      if(r<0.62){
        // Regular key
        dur=0.042+Math.random()*0.028; gainVal=0.11+Math.random()*0.13; hpF=2800+Math.random()*1200; lpF=9000; nextMs=65+Math.random()*210;
      } else if(r<0.85){
        // Soft/quiet key
        dur=0.032+Math.random()*0.022; gainVal=0.06+Math.random()*0.07; hpF=2000+Math.random()*800; lpF=7000; nextMs=55+Math.random()*180;
      } else {
        // Space bar thud
        dur=0.1+Math.random()*0.05; gainVal=0.22+Math.random()*0.14; hpF=180+Math.random()*250; lpF=1800; nextMs=320+Math.random()*480;
      }
      const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*dur),ctx.sampleRate);
      const d=buf.getChannelData(0);
      const decay=r<0.62?0.05:r<0.85?0.09:0.22;
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*decay));
      const ks=ctx.createBufferSource(); ks.buffer=buf;
      const g=ctx.createGain(); g.gain.value=gainVal;
      const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=hpF;
      const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=lpF;
      ks.connect(hp).connect(lp).connect(g).connect(volG); ks.start();
      if(r<0.85){
        const to=ctx.createOscillator(); const tg=ctx.createGain();
        to.frequency.value=r<0.62?(1100+Math.random()*500):(750+Math.random()*350);
        to.type='sine';
        tg.gain.setValueAtTime(gainVal*0.35,ctx.currentTime);
        tg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.016);
        to.connect(tg).connect(volG); to.start(); to.stop(ctx.currentTime+0.022);
      }
      setTimeout(click,nextMs);
    };
    click();
  }

  channels[id]={
    stop:()=>{
      stopped=true;
      const now=ctx.currentTime;
      fadeG.gain.cancelScheduledValues(now);
      fadeG.gain.setTargetAtTime(0,now,0.35);
      setTimeout(()=>{
        srcs.forEach(n=>{try{n.stop();}catch(e){}});
        try{fadeG.disconnect();volG.disconnect();}catch(e){};
      },1600);
    },
    cg:volG
  };
}

function stopSound(id){
  if(!channels[id]) return;
  channels[id].stop();
  delete channels[id];
}

function stopAll(){
  Object.keys(channels).forEach(id=>{channels[id].stop(); delete channels[id];});
}

function setVolume(id,val){
  if(channels[id]) channels[id].cg.gain.setTargetAtTime(val,ctx.currentTime,0.05);
}

function setMaster(val){ master.gain.setTargetAtTime(val,ctx.currentTime,0.05); }

function setBinaural(hz,base){
  if(binNodes.left){try{binNodes.left.stop();binNodes.right.stop();}catch(e){} binNodes.left=null;binNodes.right=null;}
  if(hz===0) return;
  const merger=ctx.createChannelMerger(2);
  const bg=ctx.createGain();
  bg.gain.setValueAtTime(0,ctx.currentTime);
  bg.gain.linearRampToValueAtTime(0.1,ctx.currentTime+2);
  const lo=ctx.createOscillator(); const ro=ctx.createOscillator();
  lo.frequency.value=base; ro.frequency.value=base+hz; lo.type='sine'; ro.type='sine';
  const lg=ctx.createGain(); const rg=ctx.createGain(); lg.gain.value=1; rg.gain.value=1;
  lo.connect(lg).connect(merger,0,0); ro.connect(rg).connect(merger,0,1);
  merger.connect(bg).connect(master); lo.start(); ro.start();
  binNodes.left=lo; binNodes.right=ro;
}

function chime(){
  // 4-note ascending chord with harmonics + simulated reverb tails
  const notes=[[392,0],[523,0.42],[659,0.84],[784,1.26]];
  const revDelays=[0,0.065,0.13,0.24,0.42];
  notes.forEach(([f,t])=>{
    revDelays.forEach((rv,ri)=>{
      const vol=ri===0?1:0.3*Math.pow(0.48,ri);
      [[f,0.11],[f*2,0.045],[f*3,0.018]].forEach(([freq,amp])=>{
        const o=ctx.createOscillator(); const g=ctx.createGain();
        o.frequency.value=freq; o.type='sine';
        const st=ctx.currentTime+t+rv;
        g.gain.setValueAtTime(0,st);
        g.gain.linearRampToValueAtTime(amp*vol,st+0.014);
        g.gain.exponentialRampToValueAtTime(0.001,st+(ri===0?2.8:1.6+Math.random()*0.6));
        o.connect(g).connect(master); o.start(st); o.stop(st+3.2);
      });
    });
  });
}

function startTone(){
  // Soft Tibetan-bowl-like tone (432 Hz base + harmonics)
  [[1,0.075],[2,0.038],[3,0.018],[4.2,0.009]].forEach(([ratio,amp])=>{
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.frequency.value=432*ratio; o.type='sine';
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(amp,ctx.currentTime+0.022);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(ratio===1?1.4:0.75));
    o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime+1.5);
  });
}

window.addEventListener('message',e=>{
  try{
    const msg=JSON.parse(e.data);
    if(msg.type==='start')      startSound(msg.id,msg.vol);
    else if(msg.type==='stop')      stopSound(msg.id);
    else if(msg.type==='stopAll')   stopAll();
    else if(msg.type==='volume')    setVolume(msg.id,msg.val);
    else if(msg.type==='master')    setMaster(msg.val);
    else if(msg.type==='binaural')  setBinaural(msg.hz,msg.base||200);
    else if(msg.type==='chime')     chime();
    else if(msg.type==='startTone') startTone();
    else if(msg.type==='resume')    ctx.resume();
  }catch(e){}
});
<\/script>
</html>`;

// ─── CUSTOM SLIDER ────────────────────────────────────────
function Slider({ value, onChange, disabled }) {
  const [val, setVal] = useState(value);
  const trackRef = useRef(null);
  const layoutRef = useRef({ x: 0, width: 1 });

  const remeasure = () => {
    if (trackRef.current) {
      trackRef.current.measure((_x, _y, width, _h, pageX) => {
        layoutRef.current = { x: pageX, width: width || 1 };
      });
    }
  };

  const update = (pageX) => {
    if (disabled) return;
    const ratio = Math.min(1, Math.max(0, (pageX - layoutRef.current.x) / layoutRef.current.width));
    setVal(ratio);
    onChange(ratio);
  };

  return (
    <View
      ref={trackRef}
      style={[styles.sliderTrack, disabled && { opacity: 0.25 }]}
      onLayout={remeasure}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={e => { remeasure(); update(e.nativeEvent.pageX); }}
      onResponderMove={e => update(e.nativeEvent.pageX)}
    >
      <View style={[styles.sliderFill, { width: `${val * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${Math.max(0, val * 100 - 1)}%` }]} />
    </View>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
function FocvsApp() {
  const webviewRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [activeSounds, setActiveSounds] = useState({});
  const [volumes, setVolumes] = useState(() => Object.fromEntries(SOUNDS.map(s => [s.id, 0.5])));
  const [masterVol, setMasterVolState] = useState(0.7);
  const [binaural, setBinauralState] = useState('off');
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [sessionsDone, setSessionsDone] = useState(0);
  const [freeMode, setFreeMode] = useState(false);
  const [tab, setTab] = useState('sounds');

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [timerRunning]);

  const send = useCallback((msg) => {
    if (!webviewRef.current) return;
    let js;
    const id = msg.id != null ? JSON.stringify(msg.id) : '';
    if      (msg.type === 'resume')    js = `ctx.resume();`;
    else if (msg.type === 'start')     js = `startSound(${id},${msg.vol ?? 0.5});`;
    else if (msg.type === 'stop')      js = `stopSound(${id});`;
    else if (msg.type === 'stopAll')   js = `stopAll();`;
    else if (msg.type === 'volume')    js = `setVolume(${id},${msg.val});`;
    else if (msg.type === 'master')    js = `setMaster(${msg.val});`;
    else if (msg.type === 'binaural')  js = `setBinaural(${msg.hz},${msg.base || 200});`;
    else if (msg.type === 'chime')     js = `chime();`;
    else if (msg.type === 'startTone') js = `startTone();`;
    if (js) webviewRef.current.injectJavaScript(js + ' true;');
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (freeMode) return s + 1;
          if (s <= 1) {
            setTimerRunning(false);
            setSessionsDone(d => (d + 1) % 4);
            send({ type: 'chime' });
            Vibration.vibrate([0, 300, 100, 300]);
            return PRESETS[presetIdx].min * 60;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, freeMode, presetIdx]);

  const fmt = (s) => {
    const m = Math.floor(Math.abs(s) / 60);
    const sec = Math.abs(s) % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const toggleSound = (id) => {
    send({ type: 'resume' });
    if (activeSounds[id]) {
      send({ type: 'stop', id });
      setActiveSounds(p => { const n = {...p}; delete n[id]; return n; });
    } else {
      send({ type: 'start', id, vol: volumes[id] });
      setActiveSounds(p => ({ ...p, [id]: true }));
    }
  };

  const stopAllSounds = () => {
    send({ type: 'stopAll' });
    setActiveSounds({});
  };

  const handleVolume = (id, val) => {
    send({ type: 'volume', id, val });
    setVolumes(p => ({ ...p, [id]: val }));
  };

  const handleMasterVol = (val) => {
    send({ type: 'master', val });
    setMasterVolState(val);
  };

  const handleBinaural = (b) => {
    send({ type: 'resume' });
    setBinauralState(b.id);
    send({ type: 'binaural', hz: b.hz, base: b.base });
  };

  const selectPreset = (idx) => {
    if (timerRunning) return;
    setPresetIdx(idx);
    const p = PRESETS[idx];
    setFreeMode(p.min === -1);
    setTimerSeconds(p.min === -1 ? 0 : p.min * 60);
  };

  const toggleTimer = () => {
    send({ type: 'resume' });
    if (!timerRunning) send({ type: 'startTone' });
    setTimerRunning(r => !r);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    const p = PRESETS[presetIdx];
    setTimerSeconds(p.min === -1 ? 0 : p.min * 60);
  };

  const activeCount = Object.keys(activeSounds).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Hidden audio engine — off-screen avoids iOS suspending opacity:0 WebViews */}
      <View style={{ position: 'absolute', top: -10, left: -10, width: 1, height: 1 }}>
        <WebView
          ref={webviewRef}
          source={{ html: AUDIO_HTML }}
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          onMessage={() => {}}
        />
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>F<Text style={styles.logoAccent}>O</Text>CVS</Text>
        <View style={styles.headerRight}>
          {activeCount > 0 && (
            <TouchableOpacity style={styles.stopAllBtn} onPress={stopAllSounds}>
              <Text style={styles.stopAllText}>✕ STOP</Text>
            </TouchableOpacity>
          )}
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, activeCount > 0 && styles.statusDotLive]} />
            <Text style={styles.statusText}>{activeCount > 0 ? `${activeCount} attivi` : 'silenzio'}</Text>
          </View>
        </View>
      </View>

      {/* TIMER */}
      <View style={styles.timerSection}>
        <Animated.Text style={[styles.timerDisplay, timerRunning && styles.timerRunning, { transform: [{ scale: pulseAnim }] }]}>
          {fmt(timerSeconds)}
        </Animated.Text>
        <Text style={styles.timerLabel}>{freeMode ? 'MODALITÀ LIBERA' : 'SESSIONE FOCUS'}</Text>

        <View style={styles.sessionDots}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[styles.dot, i < sessionsDone && styles.dotDone, i === sessionsDone && styles.dotCurrent]} />
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
          {PRESETS.map((p, i) => (
            <TouchableOpacity key={p.label} onPress={() => selectPreset(i)} style={[styles.presetBtn, i === presetIdx && styles.presetBtnActive]}>
              <Text style={[styles.presetLabel, i === presetIdx && styles.presetLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.timerControls}>
          <TouchableOpacity style={styles.ctrlBtnDanger} onPress={resetTimer}>
            <Text style={styles.ctrlBtnDangerText}>↺ RESET</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtnPrimary} onPress={toggleTimer}>
            <Text style={styles.ctrlBtnPrimaryText}>{timerRunning ? '⏸ PAUSA' : '▶ START'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB BAR */}
      <View style={styles.tabBar}>
        {[{ id:'sounds', label:'SUONI' },{ id:'mixer', label:'MIXER' },{ id:'binaural', label:'BINAURAL' }].map(t => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.tabActive]} onPress={() => setTab(t.id)}>
            <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

        {tab === 'sounds' && (
          <View style={styles.soundGrid}>
            {SOUNDS.map(s => {
              const active = !!activeSounds[s.id];
              return (
                <TouchableOpacity key={s.id} style={[styles.soundCard, active && styles.soundCardActive]} onPress={() => toggleSound(s.id)} activeOpacity={0.75}>
                  <Text style={styles.soundIcon}>{s.icon}</Text>
                  <Text style={styles.soundName}>{s.name}</Text>
                  <Text style={styles.soundDesc}>{s.desc}</Text>
                  {active && <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● LIVE</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tab === 'mixer' && (
          <View style={styles.mixerSection}>
            <View style={styles.mixerRow}>
              <Text style={styles.mixLabel}>MASTER</Text>
              <View style={{ flex: 1, marginHorizontal: 14 }}>
                <Slider value={masterVol} onChange={handleMasterVol} />
              </View>
              <Text style={styles.mixVal}>{Math.round(masterVol * 100)}%</Text>
            </View>
            <View style={styles.divider} />
            {SOUNDS.map(s => (
              <View key={s.id} style={styles.mixerRow}>
                <Text style={styles.mixLabel}>{s.icon} {s.name}</Text>
                <View style={{ flex: 1, marginHorizontal: 14 }}>
                  <Slider value={volumes[s.id]} onChange={v => handleVolume(s.id, v)} disabled={!activeSounds[s.id]} />
                </View>
                <Text style={styles.mixVal}>{Math.round(volumes[s.id] * 100)}%</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'binaural' && (
          <View style={styles.binauralSection}>
            <Text style={styles.binauralNote}>⚠️  Usa le cuffie per l'effetto binaural completo</Text>
            {BINAURALS.map(b => (
              <TouchableOpacity key={b.id} style={[styles.binauralCard, binaural === b.id && styles.binauralCardActive]} onPress={() => handleBinaural(b)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.binauralName, binaural === b.id && { color: C.gold }]}>{b.name}</Text>
                  <Text style={styles.binauralSub}>{b.sub}</Text>
                </View>
                {binaural === b.id && <Text style={styles.binauralCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FocvsApp />
    </SafeAreaProvider>
  );
}

// ─── STYLES ───────────────────────────────────────────────
const mono = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const bold = Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontFamily: bold, fontWeight: '900', fontSize: 22, letterSpacing: 8, color: C.accent },
  logoAccent: { color: C.gold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopAllBtn: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.red },
  stopAllText: { fontFamily: mono, fontSize: 9, color: C.red, letterSpacing: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted },
  statusDotLive: { backgroundColor: C.green },
  statusText: { fontFamily: mono, fontSize: 10, letterSpacing: 2, color: C.textDim, textTransform: 'uppercase' },

  timerSection: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  timerDisplay: { fontFamily: bold, fontWeight: '900', fontSize: 76, color: C.accent, letterSpacing: -2, lineHeight: 84 },
  timerRunning: { color: C.gold },
  timerLabel: { fontFamily: mono, fontSize: 9, letterSpacing: 4, color: C.textDim, textTransform: 'uppercase', marginTop: 6 },
  sessionDots: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: C.muted },
  dotDone: { backgroundColor: C.gold, borderColor: C.gold },
  dotCurrent: { borderColor: C.gold },
  presetsRow: { marginTop: 14, flexGrow: 0 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  presetBtnActive: { borderColor: C.gold, backgroundColor: C.goldDim },
  presetLabel: { fontFamily: mono, fontSize: 11, color: C.textDim, letterSpacing: 1 },
  presetLabelActive: { color: C.gold },
  timerControls: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ctrlBtnPrimary: { paddingHorizontal: 32, paddingVertical: 13, borderWidth: 1, borderColor: C.gold, backgroundColor: C.goldDim },
  ctrlBtnPrimaryText: { fontFamily: mono, fontSize: 12, color: C.gold, letterSpacing: 2 },
  ctrlBtnDanger: { paddingHorizontal: 18, paddingVertical: 13, borderWidth: 1, borderColor: C.red },
  ctrlBtnDangerText: { fontFamily: mono, fontSize: 12, color: C.red, letterSpacing: 2 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.gold },
  tabLabel: { fontFamily: mono, fontSize: 9, letterSpacing: 3, color: C.textDim, textTransform: 'uppercase' },
  tabLabelActive: { color: C.gold },

  content: { flex: 1 },

  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  soundCard: { width: (W - 40) / 2, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, padding: 16, position: 'relative' },
  soundCardActive: { borderColor: C.gold, backgroundColor: C.goldDim },
  soundIcon: { fontSize: 24, marginBottom: 8 },
  soundName: { fontFamily: bold, fontWeight: '700', fontSize: 13, color: C.accent, marginBottom: 3 },
  soundDesc: { fontFamily: mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5 },
  liveBadge: { position: 'absolute', top: 8, right: 8 },
  liveBadgeText: { fontFamily: mono, fontSize: 8, color: C.gold, letterSpacing: 1 },

  mixerSection: { padding: 16, gap: 18 },
  mixerRow: { flexDirection: 'row', alignItems: 'center' },
  mixLabel: { fontFamily: mono, fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: 'uppercase', width: 88 },
  mixVal: { fontFamily: mono, fontSize: 9, color: C.textDim, width: 32, textAlign: 'right' },
  divider: { height: 1, backgroundColor: C.border },
  sliderTrack: { height: 2, backgroundColor: C.muted, borderRadius: 1, position: 'relative', justifyContent: 'center' },
  sliderFill: { height: 2, backgroundColor: C.gold, borderRadius: 1 },
  sliderThumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: C.gold, marginLeft: -7, top: -6, borderWidth: 2, borderColor: C.bg },

  binauralSection: { padding: 16, gap: 8 },
  binauralNote: { fontFamily: mono, fontSize: 10, color: C.textDim, letterSpacing: 0.5, textAlign: 'center', marginBottom: 8, lineHeight: 16 },
  binauralCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  binauralCardActive: { borderColor: C.gold, backgroundColor: C.goldDim },
  binauralName: { fontFamily: bold, fontWeight: '700', fontSize: 16, color: C.accent, marginBottom: 3 },
  binauralSub: { fontFamily: mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5 },
  binauralCheck: { color: C.gold, fontSize: 18 },
});
