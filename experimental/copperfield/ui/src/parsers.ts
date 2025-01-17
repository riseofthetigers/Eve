module Parsers {
  //---------------------------------------------------------------------------
  // Utilities
  //---------------------------------------------------------------------------
  const PUNCTUATION = [".", ",", ";", ":"];

  interface Token { type: string, tokenIx?: number, lineIx?: number }
  interface LineAST extends Token { chunks: Token[] }

  interface ParseError {
    (msg:string, token?:any): Error
    reset: () => void
    tokenToChar: (token:any, line:string) => number
    tokenToString: (token:any, line:string) => string
    lines: string[]
    lineIx: number
  }
  var ParseError:ParseError = <any>function(msg, token?:any) {
    let {lines = [], lineIx} = ParseError;
    let line = lines[lineIx] || ""
    let charIx = token !== undefined ? ParseError.tokenToChar(token, line) : 0;
    let length = token !== undefined ? (ParseError.tokenToString(token, line) || "").length : line.length - charIx;
    msg += `\nOn line ${lineIx}:${charIx}`;
    if(line !== undefined) {
      msg += `\n${line}\n${underline(charIx, length)}`;
    }
    let err = <any>new Error(msg);
    err.name = "Parse Error";
    err.line = line;
    err.lineIx = lineIx;
    err.charIx = charIx;
    return err;
  }
  ParseError.reset = function() {
    ParseError.lines = ParseError.tokenToChar = ParseError.tokenToString = ParseError.lineIx = undefined;
  };

  function repeat(length, str) {
    let len = length / str.length;
    let res = "";
    for(let ix = 0; ix < len; ix++) {
      res += str;
    }
    return (res.length > length) ? res.slice(0, length) : res;
  }
  function underline(startIx, length) {
    let padding = repeat(startIx, " ");
    let underline = repeat(length - 1, "~");
    return padding + "^" + underline;
  }

  function makeTokenizer(tokens:(string)[]):((string) => string[]) {
    return function(raw:string) {
      let results = [];
      while(raw.length) {
        let minIx = raw.length;
        let minToken = raw;
        for(let token of tokens) {
          let ix = raw.indexOf(token);
          if(ix !== -1 && ix < minIx) {
            minIx = ix;
            minToken = token;
          }
        }

        if(minIx > 0 && minIx < raw.length) {
          results.push(raw.slice(0, minIx));
        }
        results.push(minToken);
        raw = raw.slice(minIx + minToken.length);
      }
      return results;
    };
  }

  export function fingerprintSource(ast:LineAST) {
    let fingerprint = "";
    let tokenIx = 0;
    let tokenCount = ast.chunks.length;
    let head = ast.chunks[0];
    if(tokenIsStructure(head)) {
      if(head.text[0] === "!" && head.text[1] === " ") {
        tokenIx = 1;
        fingerprint = head.text.slice(2);
      }
    }
    for(; tokenIx < tokenCount; tokenIx++) {
      let token = ast.chunks[tokenIx];
      fingerprint +=  tokenIsField(token) ? "?" : query.tokenToString(token);
    }
    return fingerprint;
  }

  export function coerceInput(input) {
    if (input.match(/^-?[\d]+$/gim)) {
        return parseInt(input);
    }
    else if (input.match(/^-?[\d]+\.[\d]+$/gim)) {
        return parseFloat(input);
    }
    else if (input === "true") {
        return true;
    }
    else if (input === "false") {
        return false;
    }
    return input;
  }

  //---------------------------------------------------------------------------
  // Query Parser
  //---------------------------------------------------------------------------
  interface QueryStructureAST extends Token { text: string }
  interface QueryFieldAST extends Token { grouped?: boolean, alias?: string, value?: string }
  export interface QueryAST extends LineAST {}

  interface QuerySourceAST extends LineAST { negated?: boolean }
  interface QueryOrdinalAST extends LineAST { alias: string, directions: string[] }

  interface ReifiedQueryField { field: string, grouped?: boolean, alias?: string, value?: string, ordinal?: boolean }
  interface ReifiedQuerySource {
    source: string
    sourceView: string
    fields: ReifiedQueryField[]
    negated?: boolean
    chunked?: boolean
    sort?: {ix:number, field:string, direction:string}[] // fields
    ordinal?: string|boolean //alias
  }
  interface ReifiedQueryVariable {
    selected: boolean,
    alias?:string,
    value?: any,
    ordinals?: string[],
    bindings: {source: string, field: string}[]
  }
  export interface ReifiedQuery {
    sources: ReifiedQuerySource[]
    aliases: {[alias:string]: string}
    variables: {[id:string]: ReifiedQueryVariable}
    actions: any[]
  }

  interface Query {
    (raw:string): QueryAST

    // Utilities
    ACTION_TOKENS: string[]
    TOKENS: string[]
    tokenize(raw:string): string[]
    tokenToChar(token:any, line:string): number
    tokenToString(token:any): string

    // Parsing
    parse(raw:string): QueryAST
    parseStructure(tokens:string[], tokenIx?:number):QueryStructureAST
    parseField(tokens:string[], tokenIx?:number):QueryFieldAST
    parseLine(tokens:string[], lineIx?:number):LineAST

    // Reification
    reify(ast:QueryAST, prev?:ReifiedQuery): ReifiedQuery
    reifySource(ast:QuerySourceAST, allowMissing?:boolean):ReifiedQuerySource
    reifyAction(ast:LineAST)

    // To string
    fromView(viewId:string, ixer?:Indexer.Indexer): ReifiedQuery
    unreify(reified:ReifiedQuery): QueryAST
    unparse(ast:QueryAST): string
  }

  function tokenIsStructure(token:Token): token is QueryStructureAST { return token.type === "structure"; }
  function tokenIsField(token:Token): token is QueryFieldAST { return token.type === "field"; }
  function tokenIsLine(token:Token): token is LineAST { return !!token["chunks"]; }
  function tokenIsSource(token:Token): token is QuerySourceAST {return token.type === "source"; }
  function tokenIsOrdinal(token:Token): token is QueryOrdinalAST { return token.type === "ordinal"; }
  function tokenIsAction(token:Token): token is LineAST { return token.type === "action"; }

  export var query:Query = <any>function(raw:string) {
    return query.reify(query.parse(raw));
  }

  // Utilities
  query.ACTION_TOKENS = ["+"];
  query.TOKENS = ["`", " ", "\t", "?", "$$", "\"", "!"].concat(query.ACTION_TOKENS).concat(PUNCTUATION);
  query.tokenize = makeTokenizer(query.TOKENS);
  query.tokenToChar = (token, line) => (token.tokenIx !== undefined) ? query.tokenize(line).slice(0, token.tokenIx - 1).join("").length : 0;
  query.tokenToString = function(token) {
    if(tokenIsField(token)) {
      if(token.value !== undefined) return `\`${token.value || ""}\``;
      return `?${token.grouped ? "?" : ""}${token.alias || ""}`;
    } else if(tokenIsLine(token)) {
      let res = "";
      for(let chunk of token.chunks) {
        res += query.tokenToString(chunk);
        if(chunk.lineIx !== undefined) res += "\n";
      }
      return res;
    }
    return token.text;
  }

  // Parsing
  query.parse = function(raw) {
    let ast:QueryAST = {type: "query", chunks: []};
    let lines = raw.split("\n");
    for(let ix = 0; ix < lines.length; ix++) {
      lines[ix] = lines[ix].trim();
    }
    // Set up debugging metadata globally so downstream doesn't need to be aware of it.
    ParseError.lines = lines;
    ParseError.tokenToChar = query.tokenToChar;
    ParseError.tokenToString = query.tokenToString;

    let lineIx = 0;
    for(let lineIx = 0, lineCount = lines.length; lineIx < lineCount; lineIx++) {
      ParseError.lineIx = lineIx;
      let tokens = query.tokenize(lines[lineIx]);
      if(tokens.length === 0) continue;
      let tokensLength = tokens.length;
      let parsedLine = query.parseLine(tokens, lineIx);

      // Detect line type.
      let head = parsedLine.chunks[0];
      if(tokenIsStructure(head)) {
        let text = head.text.trim().toLowerCase();
        for(let action of query.ACTION_TOKENS) {
          if(text.indexOf(action) === 0) {
            parsedLine.type = "action";
            break;
          }
        }
        if(!parsedLine.type && text.indexOf("#") === 0) parsedLine.type = "ordinal";
      }
      if(!parsedLine.type) parsedLine.type = "source";

      // Validate and extract information from line structure.
      if(tokenIsAction(parsedLine)) {
        for(let token of parsedLine.chunks) {
          if(tokenIsField(token) && !token.alias) throw ParseError("All action fields must be aliased to a query field.", token);
        }

      } else if(tokenIsOrdinal(parsedLine)) {
        let prevChunk = ast.chunks[ast.chunks.length - 1];
        if(!prevChunk || !tokenIsSource(prevChunk)) throw ParseError("Ordinal must immediately follow a source.");
        if(parsedLine.chunks.length < 2 || !tokenIsField(parsedLine.chunks[1]))
          throw ParseError("Ordinal requires a field to bind to ('?' or '?foo').", parsedLine.chunks[1]);
        if(parsedLine.chunks.length > 2 && parsedLine.chunks[2]["text"].indexOf("by") !== 1)
          throw ParseError("Ordinals are formatted as '# ? by ?... <dir>'", parsedLine.chunks[2]);

        parsedLine.alias = parsedLine.chunks[1]["alias"];
        parsedLine.directions = [];
        let sortFieldCount = 0;
        for(let tokenIx = 3, chunkCount = parsedLine.chunks.length; tokenIx < chunkCount; tokenIx++) {
          let token = parsedLine.chunks[tokenIx];
          if(tokenIsField(token)) {
            if(!token.alias) throw ParseError("Ordinal sorting fields must be aliased to a query field.", token);
            sortFieldCount++;
          } else if(tokenIsStructure(token) && sortFieldCount > 0) {
            let text = token.text.trim().toLowerCase();
            if(text.indexOf("ascending") === 0) parsedLine.directions[sortFieldCount - 1] = "ascending";
            else if(text.indexOf("descending") === 0) parsedLine.directions[sortFieldCount - 1] = "descending";
          }
        }
        if(sortFieldCount === 0) throw ParseError("Ordinal requires at least one sorting field.");

      } else if(tokenIsSource(parsedLine)) {
        if(tokenIsStructure(head)) {
          if(head.text.trim()[0] === "!") {
            parsedLine.negated = true;
          }
        }
      }

      ast.chunks.push(parsedLine);
    }

    ParseError.reset();
    return ast;
  };
  query.parseLine = function(tokens, lineIx = 0) {
    let ast:LineAST = {type: "", chunks: [], lineIx};
    let tokensLength = tokens.length;
    while(tokens.length) {
      let tokenIx = tokensLength - tokens.length + 1;
      let token = query.parseField(tokens, tokenIx)
        || query.parseStructure(tokens, tokenIx);
      if(!token) throw ParseError("Unrecognized token sequence.", {type: "", text: tokens.join(""), tokenIx});
      ast.chunks.push(token);
    }
    return ast.chunks.length ? ast : undefined;
  };
  query.parseField = function(tokens, tokenIx = 0) {
    let field:QueryFieldAST = {type: "field", tokenIx};
    let head = tokens[0];
    if(head === "?") {
      tokens.shift();
      head = tokens[0];
      if(head === "?") {
        field.grouped = true;
        tokens.shift();
        head = tokens[0];
      }
      if(head && head !== " " && PUNCTUATION.indexOf(head) === -1) {
        field.alias = head;
        tokens.shift();
      }
      return field;
    } else if(head === "`") {
      tokens.shift();
      field.value = "";
      while(true) {
        head = tokens.shift();
        if(head === "`") break;
        if(head === undefined) throw ParseError("Unterminated quoted literal.", field);
        field.value += head;
      }
      field.value = coerceInput(field.value);
      return field;
    }
  };
  query.parseStructure = function(tokens, tokenIx = 0) {
    let struct:QueryStructureAST = {type: "structure", text: "", tokenIx};
    while(true) {
      let head = tokens[0];
      if(head === undefined || head === "?" || head === "`") break;
      struct.text += tokens.shift();
    }
    if(struct.text) {
      return struct;
    }
  };

  // Reification
  function getVariable(alias, ast:ReifiedQuery, varId?:string) {
    if(!varId) varId = ast.aliases[alias] || Api.uuid();
    let variable = ast.variables[varId];
    if(!variable) variable = ast.variables[varId] = {selected: !!alias, alias: alias, bindings: []};
    if(alias) ast.aliases[alias] = varId;
    return variable;
  }

  query.reify = function(ast:QueryAST, prev?):ReifiedQuery {
    let reified:ReifiedQuery = {sources: [], aliases: {}, variables: {}, actions: []};
    let sort = [];
    for(let line of ast.chunks) {
      if(tokenIsSource(line)) {
        let source = query.reifySource(<QuerySourceAST>line);
        for(let field of source.fields) {
          let variable = getVariable(field.alias, reified);
          if(field.grouped) source.chunked = true;
          if(field.value !== undefined) variable.value = field.value;
          variable.bindings.push({source: source.source, field: field.field});
        }
        reified.sources.push(source);
      } else if(tokenIsOrdinal(line)) {
        let source = reified.sources[reified.sources.length - 1];
        source.ordinal = line.alias || true;
        let variable = getVariable(line.alias, reified);
        if(!variable.ordinals) variable.ordinals = [source.source];
        else variable.ordinals.push(source.source);
        let unsorted = [];
        for(let field of source.fields) unsorted[unsorted.length] = field.field;

        let sortFieldIx = 0;
        source.sort = [];
        for(let tokenIx = 3, chunkCount = line.chunks.length; tokenIx < chunkCount; tokenIx++) {
          let chunk = line.chunks[tokenIx];
          if(tokenIsField(chunk)) {
            for(let field of source.fields) {
              if(field.alias !== chunk.alias) continue;
              source.sort.push({
                ix: sortFieldIx,
                field: field.field,
                direction: line.directions[sortFieldIx++] || "ascending"
              });
              unsorted.splice(unsorted.indexOf(field.field), 1);
              break;
            }
          }
        }

        for(let fieldId of unsorted) source.sort.push({ix: sortFieldIx++, field: fieldId, direction: "ascending"});

      } else if(tokenIsAction(line)) {
        let action = query.reifyAction(line);
        reified.actions.push(action);
      }
    }

    return reified;
  };
  query.reifySource = function(ast, allowMissing = false) {
    ParseError.lineIx = ast.lineIx;
    let fingerprint = fingerprintSource(ast);
    let {"view fingerprint: view":view} = Api.ixer.findOne("view fingerprint", {"view fingerprint: fingerprint": fingerprint}) || {};
    if(!view && !allowMissing) throw ParseError(`Fingerprint '${fingerprint}' matches no known views.`); //@NOTE: Should this create a union..?

    let source:ReifiedQuerySource = {negated: ast.negated, source: Api.uuid(), sourceView: view, fields: []};
    let fieldIxes = Api.ixer.find("fingerprint field", {"fingerprint field: fingerprint": fingerprint});
    if(fieldIxes) {
      fieldIxes = fieldIxes.slice();
      fieldIxes.sort((a, b) => a["fingerprint field: ix"] - b["fingerprint field: ix"]);
    } else {
      fieldIxes = fieldIxes ? fieldIxes.slice() : [];
    }

    for(let token of ast.chunks) {
      if(tokenIsField(token)) {
        let {"fingerprint field: field":field} = fieldIxes.shift() || {};
        if(!field && !allowMissing) throw ParseError(`Fingerprint '${fingerprint}' is missing a field for blank '${query.tokenToString(token)}'.`);
        source.fields.push({field, grouped: token.grouped, alias: token.alias, value: token.value});
      }
    }

    return source;
  };
  query.reifyAction = function(ast) {
    let action = {action: (<QueryStructureAST>ast.chunks[0]).text, view: Api.uuid(), fields: []};
    if(action.action === "+") {
      let source = query.reifySource({type: "source", chunks: ast.chunks}, true);
      for(let field of source.fields) {
        field.field = Api.uuid();
        action.fields.push(field);
      }
    }
    return action;
  }

  query.fromView = function(viewId:string, ixer:Indexer.Indexer = Api.ixer) {
    let reified:ReifiedQuery = {sources: [], aliases: {}, variables: {}, actions: []};
    let ordinalSourceAlias:{[source:string]: string|boolean} = {};
    let bindingFieldVariable:{[id:string]: ReifiedQueryVariable} = {};
    for(let varId of Api.extract("variable: variable", Api.ixer.find("variable", {"variable: view": viewId}))) {
      // {selected: boolean, alias?:string, value?: any, ordinals?: string[], bindings: {source: string, field: string}[]}
      let fieldId = (ixer.findOne("select", {"select: variable": varId}) || {})["select: field"];
      let alias = Api.get.name(fieldId) || undefined;
      let variable = getVariable(alias, reified, varId);
      variable.selected = !!fieldId;

      variable.value = (ixer.findOne("constant binding", {"constant binding: variable": varId}) || {})["constant binding: value"];
      let ordinalSources = Api.extract("ordinal binding: source", Api.ixer.find("ordinal binding", {"ordinal binding: variable": varId}));
      if(ordinalSources.length) {
        variable.ordinals = ordinalSources;
        for(let sourceId of ordinalSources) ordinalSourceAlias[sourceId] = alias || true;
      }
      variable.bindings = Api.humanize("binding", Api.ixer.find("binding", {"binding: variable": varId}));
      for(let binding of variable.bindings) {
        bindingFieldVariable[binding.field] = variable;
      }
    }

    for(let rawSource of Api.ixer.find("source", {"source: view": viewId})) {
      let source:ReifiedQuerySource = {source: rawSource["source: source"], sourceView: rawSource["source: source view"], fields: []};
      reified.sources[reified.sources.length] = source;

      if(ordinalSourceAlias[source.source]) source.ordinal = ordinalSourceAlias[source.source];
      if(Api.ixer.findOne("chunked source", {"chunked source: source": source.source})) source.chunked = true;
      if(Api.ixer.findOne("negated source", {"negated source: source": source.source})) source.negated = true;

      let sorted = Api.ixer.find("sorted field", {"sorted field: source": source.source});
      if(sorted && sorted.length) source.sort = Api.humanize("sorted field", sorted);

      let fieldIds = Api.get.fields(source.sourceView);
      for(let fieldId of fieldIds) {
        let field:ReifiedQueryField = {field: fieldId};
        source.fields[source.fields.length] = field;
        if(Api.ixer.findOne("grouped field", {"grouped field: field": fieldId})) field.grouped = true;

        let variable = bindingFieldVariable[fieldId];
        if(variable.alias) field.alias = variable.alias;
        if(variable.value !== undefined) field.value = variable.value;
        if(variable.ordinals !== undefined && variable.ordinals.indexOf(source.source) !== -1) field.ordinal = true;
      }
    }

    return reified;
  }

  query.unreify = function(reified:ReifiedQuery) {
    let ast:QueryAST = {type: "query", chunks: []};
    for(let source of reified.sources) {
      // @FIXME: This may not be the correct fingerprint, we need to look through all of them
      // comparing field ordering. This still isn't lossless, but it's at least better.
      let fingerprint = (Api.ixer.findOne("view fingerprint", {"view fingerprint: view": source.sourceView}) || {})["view fingerprint: fingerprint"];
      if(!fingerprint) throw new Error(`No fingerprint found for view '${source.sourceView}'.`);
      let structures = fingerprint.split("?");
      let tail:string = structures.pop(); // We don't want to tack a field to the end of the fingerprint.
      let line:QuerySourceAST = {type: "source", negated: source.negated, chunks: [], lineIx: ast.chunks.length};
      ast.chunks[ast.chunks.length] = line;

      let fieldIx = 0;
      for(let text of structures) {
        // Add structure token if there's any text.
        if(text) line.chunks[line.chunks.length] = <QueryStructureAST>{type: "structure", text};

        // Add field token between this structure token and the next.
        let field:ReifiedQueryField = source.fields[fieldIx++];
        line.chunks[line.chunks.length] = <QueryFieldAST>{type: "field", alias: field.alias, grouped: field.grouped, value: field.value};
      }
      if(tail) line.chunks[line.chunks.length] = <QueryStructureAST>{type: "structure", text: tail};

      if(source.ordinal) {
        let line:QueryOrdinalAST = {type: "ordinal", alias: undefined, directions: [], chunks: [], lineIx: ast.chunks.length};
        ast.chunks[ast.chunks.length] = line;

        if(source.ordinal !== true) line.alias = <string>source.ordinal;
        line.chunks[0] = <QueryStructureAST>{type: "structure", text: `# ?${line.alias || ""} by `};

        let fields = {};
        for(let field of source.fields) {
          fields[field.field] = field;
        }

        // Super lossy, but nothing can be done about it.
        for(let {ix, field:fieldId, direction} of source.sort) {
          let field = fields[fieldId];
          line.chunks[line.chunks.length] = <QueryFieldAST>{type: "field", alias: field.alias, grouped: field.grouped, value: field.value};
          line.chunks[line.chunks.length] = <QueryStructureAST>{type: "structure", text: ` ${direction} `};
          line.directions[line.directions.length] = direction;
        }
      }
    }

    if(reified.actions.length) throw new Error("@TODO Implement action unreification.");

    return ast;
  }

  query.unparse = (ast:QueryAST) => query.tokenToString(ast);
}