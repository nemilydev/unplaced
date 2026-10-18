"use strict";
// ════════════════════════════════════════════════════════════
// EMBER — JavaScript port of forge-lang/main.py
// 1. Tokens · 2. Lexer · 3. AST · 4. Parser · 5. Runtime · 6. Env · 7. Interpreter
// ════════════════════════════════════════════════════════════

// --- 1. Tokens ---
const T={
 NUMBER:"NUMBER",STRING:"STRING",TRUE:"TRUE",FALSE:"FALSE",NIL:"NIL",IDENT:"IDENT",
 LET:"LET",FN:"FN",IF:"IF",ELSE:"ELSE",ELIF:"ELIF",WHILE:"WHILE",FOR:"FOR",IN:"IN",
 RETURN:"RETURN",BREAK:"BREAK",CONTINUE:"CONTINUE",AND:"AND",OR:"OR",NOT:"NOT",
 PLUS:"PLUS",MINUS:"MINUS",STAR:"STAR",SLASH:"SLASH",PERCENT:"PERCENT",
 ASSIGN:"ASSIGN",EQ:"EQ",NEQ:"NEQ",LT:"LT",GT:"GT",LTE:"LTE",GTE:"GTE",
 LPAREN:"LPAREN",RPAREN:"RPAREN",LBRACE:"LBRACE",RBRACE:"RBRACE",
 LBRACKET:"LBRACKET",RBRACKET:"RBRACKET",COMMA:"COMMA",DOT:"DOT",COLON:"COLON",
 SEMI:"SEMI",PIPE:"PIPE",EOF:"EOF"};
const KEYWORDS={let:T.LET,fn:T.FN,if:T.IF,else:T.ELSE,elif:T.ELIF,while:T.WHILE,
 for:T.FOR,in:T.IN,return:T.RETURN,break:T.BREAK,continue:T.CONTINUE,
 and:T.AND,or:T.OR,not:T.NOT,true:T.TRUE,false:T.FALSE,nil:T.NIL};
const SINGLE={"+":T.PLUS,"-":T.MINUS,"*":T.STAR,"/":T.SLASH,"%":T.PERCENT,
 "(":T.LPAREN,")":T.RPAREN,"{":T.LBRACE,"}":T.RBRACE,"[":T.LBRACKET,"]":T.RBRACKET,
 ",":T.COMMA,".":T.DOT,":":T.COLON,";":T.SEMI,"|":T.PIPE,
 "=":T.ASSIGN,"<":T.LT,">":T.GT,"!":T.NEQ};

// --- 2. Lexer ---
class LexerError extends Error{}
class Lexer{
 constructor(src){this.src=src;this.pos=0;this.line=1;this.col=1;this.tokens=[];}
 peek(off=0){const i=this.pos+off;return i<this.src.length?this.src[i]:"\0";}
 advance(){const ch=this.src[this.pos++];if(ch==="\n"){this.line++;this.col=1;}else this.col++;return ch;}
 tokenize(){
  while(this.pos<this.src.length){
   const ch=this.peek();
   if(" \t\r\n".includes(ch))this.advance();
   else if(ch==="#"){while(this.peek()!=="\n"&&this.peek()!=="\0")this.advance();}
   else if(ch==='"')this._string();
   else if(/[0-9]/.test(ch))this._number();
   else if(/[a-zA-Z_]/.test(ch))this._identifier();
   else if(ch in SINGLE)this._operator();
   else throw new LexerError(`Unexpected character ${JSON.stringify(ch)} at ${this.line}:${this.col}`);
  }
  this.tokens.push({type:T.EOF,value:"",line:this.line,col:this.col});
  return this.tokens;
 }
 _string(){
  const line=this.line,col=this.col;this.advance();
  const chars=[];
  while(this.peek()!=='"'&&this.peek()!=="\0"){
   if(this.peek()==="\\"){
    this.advance();const esc=this.advance();
    chars.push({"n":"\n","t":"\t","\\":"\\",'"':'"',"\r":"\r","0":"\0"}[esc]??("\\"+esc));
   }else chars.push(this.advance());
  }
  if(this.peek()==="\0")throw new LexerError(`Unterminated string at ${line}:${col}`);
  this.advance();
  this.tokens.push({type:T.STRING,value:chars.join(""),line,col});
 }
 _number(){
  const line=this.line,col=this.col;const chars=[];
  while(/[0-9]/.test(this.peek()))chars.push(this.advance());
  if(this.peek()==="."&&/[0-9]/.test(this.peek(1))){
   chars.push(this.advance());
   while(/[0-9]/.test(this.peek()))chars.push(this.advance());
  }
  this.tokens.push({type:T.NUMBER,value:chars.join(""),line,col});
 }
 _identifier(){
  const line=this.line,col=this.col;const chars=[];
  while(/[a-zA-Z0-9_]/.test(this.peek()))chars.push(this.advance());
  const word=chars.join("");
  this.tokens.push({type:KEYWORDS[word]??T.IDENT,value:word,line,col});
 }
 _operator(){
  const line=this.line,col=this.col;const ch=this.advance();
  const two=ch+this.peek();
  if(["==","!=","<=",">=","->"].includes(two)){this.advance();
   this.tokens.push({type:two==="=="?T.EQ:two==="!="?T.NEQ:two==="<="?T.LTE:two===">="?T.GTE:T.PIPE,value:two,line,col});
  }else this.tokens.push({type:SINGLE[ch],value:ch,line,col});
 }
}

// --- 3. AST nodes (kind-tagged plain objects) ---
const N=(kind,props)=>Object.assign({kind},props);

// --- 4. Parser ---
class ParseError extends Error{}
class Parser{
 constructor(toks){this.toks=toks;this.pos=0;}
 peek(off=0){return this.toks[Math.min(this.pos+off,this.toks.length-1)];}
 advance(){return this.toks[this.pos++];}
 check(t){return this.peek().type===t;}
 match(...ts){if(ts.includes(this.peek().type))return this.advance();return null;}
 expect(t,msg=""){
  if(!this.check(t)){const tok=this.peek();
   throw new ParseError(`Expected ${t} but got ${tok.type} (${JSON.stringify(tok.value)}) at ${tok.line}:${tok.col}. ${msg}`);}
  return this.advance();
 }
 parse(){
  const stmts=[];
  while(!this.check(T.EOF))stmts.push(this.statement());
  return stmts;
 }
 statement(){
  if(this.check(T.LET))return this.let_stmt();
  if(this.check(T.FN))return this.fn_stmt();
  if(this.check(T.IF))return this.if_stmt();
  if(this.check(T.WHILE))return this.while_stmt();
  if(this.check(T.FOR))return this.for_stmt();
  if(this.check(T.RETURN))return this.return_stmt();
  if(this.check(T.BREAK)){this.advance();this.match(T.SEMI);return N("Break",{});}
  if(this.check(T.CONTINUE)){this.advance();this.match(T.SEMI);return N("Continue",{});}
  if(this.check(T.LBRACE))return this.block();
  return this.expr_statement();
 }
 let_stmt(){
  this.advance();
  const name=this.expect(T.IDENT).value;
  this.expect(T.ASSIGN,"Expected '=' in let binding");
  const value=this.expression();this.match(T.SEMI);
  return N("Let",{name,value});
 }
 fn_stmt(){
  this.advance();let name=null;
  if(this.check(T.IDENT))name=this.advance().value;
  this.expect(T.LPAREN,"Expected '(' after fn");
  const params=[];
  if(!this.check(T.RPAREN)){
   params.push(this.expect(T.IDENT).value);
   while(this.match(T.COMMA))params.push(this.expect(T.IDENT).value);
  }
  this.expect(T.RPAREN);
  const body=this.block();
  return N("Fn",{params,body:body.stmts,name});
 }
 if_stmt(){
  this.advance();this.expect(T.LPAREN);
  const cond=this.expression();this.expect(T.RPAREN);
  const then=this.block().stmts;
  const branches=[];let els=null;
  while(this.check(T.ELIF)){
   this.advance();this.expect(T.LPAREN);
   const ec=this.expression();this.expect(T.RPAREN);
   branches.push([ec,this.block().stmts]);
  }
  if(this.match(T.ELSE)){
   if(this.check(T.IF))els=[this.if_stmt()];
   else els=this.block().stmts;
  }
  return N("If",{cond,then,branches,els});
 }
 while_stmt(){
  this.advance();this.expect(T.LPAREN);
  const cond=this.expression();this.expect(T.RPAREN);
  return N("While",{cond,body:this.block().stmts});
 }
 for_stmt(){
  this.advance();this.expect(T.LPAREN);
  const v=this.expect(T.IDENT).value;this.expect(T.IN);
  const iterable=this.expression();this.expect(T.RPAREN);
  return N("For",{var:v,iterable,body:this.block().stmts});
 }
 return_stmt(){
  this.advance();
  const value=(this.check(T.SEMI)||this.check(T.RBRACE))?N("Nil",{}):this.expression();
  this.match(T.SEMI);
  return N("Return",{value});
 }
 block(){
  this.expect(T.LBRACE);
  const stmts=[];
  while(!this.check(T.RBRACE)&&!this.check(T.EOF))stmts.push(this.statement());
  this.expect(T.RBRACE);
  return N("Block",{stmts});
 }
 expr_statement(){const expr=this.expression();this.match(T.SEMI);return N("ExprStmt",{expr});}
 expression(){return this.assignment();}
 assignment(){
  const expr=this.or_expr();
  if(this.check(T.ASSIGN)){
   this.advance();
   const value=this.assignment();
   if(expr.kind!=="Ident")throw new ParseError("Invalid assignment target");
   return N("Assign",{name:expr.name,value,line:expr.line});
  }
  return expr;
 }
 or_expr(){let left=this.and_expr();while(this.check(T.OR)){this.advance();left=N("BinOp",{op:"or",left,right:this.and_expr()});}return left;}
 and_expr(){let left=this.equality();while(this.check(T.AND)){this.advance();left=N("BinOp",{op:"and",left,right:this.equality()});}return left;}
 equality(){let left=this.comparison();let t;while((t=this.match(T.EQ,T.NEQ)))left=N("BinOp",{op:t.value,left,right:this.comparison()});return left;}
 comparison(){let left=this.term();let t;while((t=this.match(T.LT,T.GT,T.LTE,T.GTE)))left=N("BinOp",{op:t.value,left,right:this.term()});return left;}
 term(){let left=this.factor();let t;while((t=this.match(T.PLUS,T.MINUS)))left=N("BinOp",{op:t.value,left,right:this.factor()});return left;}
 factor(){let left=this.unary();let t;while((t=this.match(T.STAR,T.SLASH,T.PERCENT)))left=N("BinOp",{op:t.value,left,right:this.unary()});return left;}
 unary(){let t;if((t=this.match(T.NOT,T.MINUS)))return N("UnaryOp",{op:t.value,operand:this.unary()});return this.call();}
 call(){
  let expr=this.primary();
  for(;;){
   if(this.match(T.LPAREN)){
    const args=[];
    if(!this.check(T.RPAREN)){
     args.push(this.expression());
     while(this.match(T.COMMA))args.push(this.expression());
    }
    this.expect(T.RPAREN);
    expr=N("Call",{callee:expr,args});
   }else if(this.match(T.LBRACKET)){
    const index=this.expression();this.expect(T.RBRACKET);
    expr=N("Index",{obj:expr,index});
   }else if(this.match(T.DOT)){
    const name=this.expect(T.IDENT).value;
    expr=N("Member",{obj:expr,name});
   }else break;
  }
  return expr;
 }
 primary(){
  let t;
  if((t=this.match(T.NUMBER)))return N("Num",{value:parseFloat(t.value)});
  if((t=this.match(T.STRING)))return N("Str",{value:t.value});
  if(this.match(T.TRUE))return N("Bool",{value:true});
  if(this.match(T.FALSE))return N("Bool",{value:false});
  if(this.match(T.NIL))return N("Nil",{});
  if(this.check(T.FN)){
   this.advance();this.expect(T.LPAREN,"Expected '(' after fn");
   const params=[];
   if(!this.check(T.RPAREN)){
    params.push(this.expect(T.IDENT).value);
    while(this.match(T.COMMA))params.push(this.expect(T.IDENT).value);
   }
   this.expect(T.RPAREN);
   return N("Fn",{params,body:this.block().stmts,name:null});
  }
  if((t=this.match(T.IDENT)))return N("Ident",{name:t.value,line:t.line});
  if(this.match(T.LPAREN)){const e=this.expression();this.expect(T.RPAREN);return e;}
  if(this.match(T.LBRACKET)){
   const elements=[];
   if(!this.check(T.RBRACKET)){
    elements.push(this.expression());
    while(this.match(T.COMMA)){if(this.check(T.RBRACKET))break;elements.push(this.expression());}
   }
   this.expect(T.RBRACKET);
   return N("ListLit",{elements});
  }
  const tok=this.peek();
  throw new ParseError(`Unexpected token ${tok.type} (${JSON.stringify(tok.value)}) at ${tok.line}:${tok.col}`);
 }
}

// --- 5. Runtime values ---
const EmberList=elements=>({__ember:"list",elements});
const isList=v=>v&&v.__ember==="list";
const EmberFunction=(params,body,closure,name="<anon>")=>({__ember:"fn",params,body,closure,name});
const isFn=v=>v&&v.__ember==="fn";
const EmberBuiltin=(fn,name)=>({__ember:"builtin",fn,name});
const isBuiltin=v=>v&&v.__ember==="builtin";
class ReturnSignal extends Error{constructor(value){super("return");this.value=value;}}
class BreakSignal extends Error{}
class ContinueSignal extends Error{}

// --- 6. Environment ---
class EmberRuntimeError extends Error{}
class Environment{
 constructor(parent=null){this.vars={};this.parent=parent;}
 get(name){
  let env=this;
  while(env){if(name in env.vars)return env.vars[name];env=env.parent;}
  throw new EmberRuntimeError(`Undefined variable '${name}'`);
 }
 set(name,value){
  let env=this;
  while(env){if(name in env.vars){env.vars[name]=value;return;}env=env.parent;}
  throw new EmberRuntimeError(`Cannot assign to undefined variable '${name}' — use 'let' first`);
 }
 define(name,value){this.vars[name]=value;}
}

// --- 7. Interpreter ---
class Interpreter{
 constructor(printFn){
  this.print=printFn||(s=>console.log(s));
  this.globals=new Environment();
  this._install_builtins();
 }
 run(source){
  const tokens=new Lexer(source).tokenize();
  const ast=new Parser(tokens).parse();
  for(const stmt of ast)this.execute(stmt,this.globals);
 }
 exec_block(stmts,env){
  const blockEnv=new Environment(env);
  for(const s of stmts)this.execute(s,blockEnv);
 }
 execute(node,env){
  switch(node.kind){
   case "Let":env.define(node.name,this.evaluate(node.value,env));return;
   case "Fn":{
    const fn=EmberFunction(node.params,node.body,env,node.name||"<anon>");
    if(node.name)env.define(node.name,fn);
    return fn;}
   case "If":
    if(this.truthy(this.evaluate(node.cond,env))){this.exec_block(node.then,env);return;}
    for(const[ec,eb]of node.branches)
     if(this.truthy(this.evaluate(ec,env))){this.exec_block(eb,env);return;}
    if(node.els!==null)this.exec_block(node.els,env);
    return;
   case "While":
    while(this.truthy(this.evaluate(node.cond,env))){
     try{this.exec_block(node.body,env);}
     catch(e){if(e instanceof BreakSignal)break;if(e instanceof ContinueSignal)continue;throw e;}
    }
    return;
   case "For":{
    const it=this.evaluate(node.iterable,env);
    let items;
    if(isList(it))items=it.elements;
    else if(typeof it==="string")items=[...it];
    else if(typeof it==="number")items=Array.from({length:Math.trunc(it)},(_,i)=>i);
    else throw new EmberRuntimeError("Cannot iterate over "+this.typeName(it));
    for(const item of items){
     const loopEnv=new Environment(env);loopEnv.define(node.var,item);
     try{this.exec_block(node.body,loopEnv);}
     catch(e){if(e instanceof BreakSignal)break;if(e instanceof ContinueSignal)continue;throw e;}
    }
    return;}
   case "Return":throw new ReturnSignal(this.evaluate(node.value,env));
   case "Break":throw new BreakSignal();
   case "Continue":throw new ContinueSignal();
   case "ExprStmt":this.evaluate(node.expr,env);return;
   default:throw new EmberRuntimeError("Cannot execute "+node.kind);
  }
 }
 evaluate(node,env){
  switch(node.kind){
   case "Num":case "Str":case "Bool":return node.value;
   case "Nil":return null;
   case "Fn":return EmberFunction(node.params,node.body,env,node.name||"<anon>");
   case "Ident":return env.get(node.name);
   case "ListLit":return EmberList(node.elements.map(e=>this.evaluate(e,env)));
   case "BinOp":{
    if(node.op==="and"){const l=this.evaluate(node.left,env);return this.truthy(l)?this.evaluate(node.right,env):l;}
    if(node.op==="or"){const l=this.evaluate(node.left,env);return this.truthy(l)?l:this.evaluate(node.right,env);}
    const l=this.evaluate(node.left,env),r=this.evaluate(node.right,env);
    switch(node.op){
     case "+":
      if(typeof l==="string"||typeof r==="string")return this.toStr(l)+this.toStr(r);
      if(isList(l)&&isList(r))return EmberList(l.elements.concat(r.elements));
      return l+r;
     case "-":return l-r;
     case "*":
      if(typeof l==="string"&&typeof r==="number")return l.repeat(Math.trunc(r));
      if(typeof l==="number"&&typeof r==="string")return r.repeat(Math.trunc(l));
      return l*r;
     case "/":
      if(r===0)throw new EmberRuntimeError("Division by zero");
      return l/r;
     case "%":
      if(r===0)throw new EmberRuntimeError("Modulo by zero");
      return l%r;
     case "==":return this.eq(l,r);
     case "!=":return !this.eq(l,r);
     case "<":return l<r;
     case ">":return l>r;
     case "<=":return l<=r;
     case ">=":return l>=r;
    }
    throw new EmberRuntimeError("Unknown operator "+node.op);}
   case "UnaryOp":{
    const v=this.evaluate(node.operand,env);
    if(node.op==="not")return !this.truthy(v);
    if(node.op==="-")return -v;
    throw new EmberRuntimeError("Unknown unary operator "+node.op);}
   case "Assign":{
    const v=this.evaluate(node.value,env);env.set(node.name,v);return v;}
   case "Call":{
    const callee=this.evaluate(node.callee,env);
    const args=node.args.map(a=>this.evaluate(a,env));
    return this.callFn(callee,args);}
   case "Index":{
    const obj=this.evaluate(node.obj,env);
    let idx=this.evaluate(node.index,env);
    if(isList(obj)){
     if(typeof idx!=="number")throw new EmberRuntimeError("List index must be a number");
     let i=Math.trunc(idx);
     if(i<0)i+=obj.elements.length;
     if(i<0||i>=obj.elements.length)
      throw new EmberRuntimeError(`Index ${i} out of range (0..${obj.elements.length-1})`);
     return obj.elements[i];
    }
    if(typeof obj==="string"){
     let i=Math.trunc(idx);
     if(i<0)i+=obj.length;
     return obj[i];
    }
    throw new EmberRuntimeError("Cannot index "+this.typeName(obj));}
   case "Member":{
    const obj=this.evaluate(node.obj,env);
    const name=node.name;
    if(isList(obj)){
     if(name==="len")return obj.elements.length;
     if(name==="push")return EmberBuiltin(a=>{obj.elements.push(a[0]);return null;},"push");
     if(name==="pop")return EmberBuiltin(()=>obj.elements.length?obj.elements.pop():null,"pop");
     if(name==="join")return EmberBuiltin(a=>obj.elements.map(e=>this.toStr(e)).join(a[0]??"​, "),"join");
     if(name==="map")return EmberBuiltin(a=>EmberList(obj.elements.map(item=>this.callFn(a[0],[item]))),"map");
     if(name==="filter")return EmberBuiltin(a=>EmberList(obj.elements.filter(item=>this.truthy(this.callFn(a[0],[item])))),"filter");
     if(name==="first")return obj.elements[0]??null;
     if(name==="last")return obj.elements[obj.elements.length-1]??null;
    }
    if(typeof obj==="string"){
     if(name==="len")return obj.length;
     if(name==="upper")return EmberBuiltin(()=>obj.toUpperCase(),"upper");
     if(name==="lower")return EmberBuiltin(()=>obj.toLowerCase(),"lower");
     if(name==="split")return EmberBuiltin(a=>EmberList(obj.split(a[0]||" ")),"split");
    }
    throw new EmberRuntimeError(`No member '${name}' on ${this.typeName(obj)}`);}
  }
  throw new EmberRuntimeError("Cannot evaluate "+node.kind);
 }
 callFn(callee,args){
  if(isBuiltin(callee))return callee.fn(args);
  if(isFn(callee)){
   if(args.length!==callee.params.length)
    throw new EmberRuntimeError(`Expected ${callee.params.length} arguments, got ${args.length}`);
   const callEnv=new Environment(callee.closure);
   callee.params.forEach((p,i)=>callEnv.define(p,args[i]));
   try{this.exec_block(callee.body,callEnv);}
   catch(e){if(e instanceof ReturnSignal)return e.value;throw e;}
   return null;
  }
  throw new EmberRuntimeError("Cannot call "+this.typeName(callee));
 }
 eq(a,b){
  if(isList(a)&&isList(b))
   return a.elements.length===b.elements.length&&a.elements.every((e,i)=>this.eq(e,b.elements[i]));
  return a===b;
 }
 truthy(v){
  if(v===null||v===undefined)return false;
  if(typeof v==="boolean")return v;
  if(typeof v==="number")return v!==0;
  if(typeof v==="string")return v.length>0;
  if(isList(v))return v.elements.length>0;
  return true;
 }
 typeName(v){
  if(v===null||v===undefined)return"nil";
  if(typeof v==="boolean")return"bool";
  if(typeof v==="number")return"number";
  if(typeof v==="string")return"string";
  if(isList(v))return"list";
  if(isFn(v)||isBuiltin(v))return"function";
  return"unknown";
 }
 toStr(v){
  if(v===null||v===undefined)return"nil";
  if(typeof v==="boolean")return v?"true":"false";
  if(typeof v==="number")return Number.isInteger(v)?String(v):String(v);
  if(isList(v))return"["+v.elements.map(e=>this.toStr(e)).join(", ")+"]";
  if(isFn(v))return `<fn ${v.name}(${v.params.join(", ")})>`;
  if(isBuiltin(v))return `<builtin ${v.name}>`;
  return String(v);
 }
 _install_builtins(){
  const g=this.globals;
  g.define("print",EmberBuiltin(a=>{this.print(a.map(x=>this.toStr(x)).join(" "));return null;},"print"));
  g.define("len",EmberBuiltin(a=>isList(a[0])?a[0].elements.length:typeof a[0]==="string"?a[0].length:0,"len"));
  g.define("type",EmberBuiltin(a=>this.typeName(a[0]),"type"));
  g.define("str",EmberBuiltin(a=>this.toStr(a[0]),"str"));
  g.define("num",EmberBuiltin(a=>a[0]===null?0:parseFloat(a[0]),"num"));
  g.define("range",EmberBuiltin(a=>{
   const start=Math.trunc(a[0]);
   const end=a.length>1?Math.trunc(a[1]):0;
   const lo=a.length>1?start:0,hi=a.length>1?end:start;
   const out=[];for(let i=lo;i<hi;i++)out.push(i);
   return EmberList(out);
  },"range"));
  g.define("int",EmberBuiltin(a=>Math.trunc(parseFloat(a[0])),"int"));
  g.define("abs",EmberBuiltin(a=>Math.abs(a[0]),"abs"));
  g.define("min",EmberBuiltin(a=>Math.min(...a),"min"));
  g.define("max",EmberBuiltin(a=>Math.max(...a),"max"));
  g.define("floor",EmberBuiltin(a=>Math.floor(a[0]),"floor"));
  g.define("ceil",EmberBuiltin(a=>Math.ceil(a[0]),"ceil"));
  g.define("round",EmberBuiltin(a=>Math.round(a[0]),"round"));
  g.define("push",EmberBuiltin(a=>{if(isList(a[0]))a[0].elements.push(a[1]);return null;},"push"));
 }
}

// --- export (browser + Node harness) ---
if (typeof window !== "undefined") {
  window.Ember = { Interpreter, Lexer, Parser };
}

