var examples = {
  "My Stack": "",
  "Editor": "* tableCardProgram\n  ~ run program\n\n* remoteViewsToTrack\n  ~ recipient view alias asCells\n  + \"Editor\" \"error\" \"editorError\" \"\"\n  + \"Editor\" \"profile\" \"editorProfile\" \"\"\n\n* drawControlCard\n  | tableCardProgram program\n  [\"div\" {\"id\" \"controlCard\" \"class\" \"card controlCard open\" \"ix\" \"a\"}\n    [\"h1\" program]]\n\n* drawUICard\n  | tableCardProgram program\n  [\"div\" {\"id\" \"uiCard\" \"class\" \"card uiCard open\" \"ix\" \"aaa\"}\n    [\"header\"\n      [\"h2\" \"UI\"]]]\n\n* drawErrorCard\n  > error | localErrors = count(@error.error)\n  > compileError | compileErrors = count(@compileError.error)\n  > editorError | remoteErrors = count(@editorError.error)\n  ? @remoteErrors + @localErrors + @compileErrors > 0\n  [\"div\" {\"id\" \"errorCard\" \"class\" \"card errorCard\" \"ix\" \"aa\"}\n    ]\n\n* drawRemoteErrors\n  | editorError error\n  [\"pre\" {\"parent\" \"errorCard\" \"id\" error} error]\n\n* drawLocalErrors\n  | error error\n  [\"pre\" {\"parent\" \"errorCard\" \"id\" error} error]\n\n* drawCompileErrors\n  | compileError error\n  [\"pre\" {\"parent\" \"errorCard\" \"id\" error} error]\n\n* drawPerfCard\n  > editorProfile event=\"runtime\" | runtime = maxBy(@editorProfile.time, @editorProfile.run, 0)\n  > editorProfile event=\"remoteWatcher\" | watcher = maxBy(@editorProfile.time, @editorProfile.run, 0)\n  > editorProfile event=\"compile\" | compile = maxBy(@editorProfile.time, @editorProfile.run, 0).toFixed(2)\n  > profile event=\"runtime\" | editor = maxBy(@profile.time, @profile.run, 0)\n  > profile event=\"remoteWatcher\" | editorWatcher = maxBy(@profile.time, @profile.run, 0)\n  totalRun = (@watcher + @runtime).toFixed(2)\n  totalEditor = (@editorWatcher + @editor).toFixed(2)\n  [\"div\" {\"id\" \"perfCard\" \"class\" \"card perfCard\" \"ix\" \"zzzzzzzzzzz\"}\n    [\"h2\" \"Performance\"]\n    [\"p\" {\"style\" \"margin-top:10px\"} \"runtime: \" totalRun]\n    [\"p\" \"compile: \" compile]\n    [\"p\" \"editor: \" totalEditor]\n    ]\n\n* drawTableCard\n  | realViews view:table remote\n  id = \"table|\" + @remote + \"|\" + @table\n  gridId = \"grid\" + @remote + \"|\" + @table\n  gridHeaderId = \"gridHeader\" + @table\n  [\"div\" {\"id\" id \"class\" \"card table-card open\" \"ix\" table}\n    [\"h2\" table]\n    [\"div\" {\"id\" gridId \"class\" \"grid\" \"gid\" gridId}\n    [\"div\" {\"id\" gridHeaderId \"class\" \"grid-header\" \"ix\" \"\" \"hid\" gridHeaderId}]]]\n\n* drawTableCardGridHeaders\n  | realViews view\n  | editor|field view field ix\n  | editor|displayName id:field name\n  gridHeaderId = \"gridHeader\" + @view\n  id = @view + @field + @ix\n  [\"div\" {\"id\" id \"parent\" gridHeaderId \"class\" \"header\" \"ix\" ix \"style\" \"\"}\n   name]\n\n* drawTableCardRows\n  | resultCell view:table row\n  id = \"row\" + @table + @row\n  gridId = \"grid\" + @table\n  ix = @row + 1\n  [\"div\" {\"id\" id \"parent\" gridId \"row\" ix \"ix\" ix \"class\" \"grid-row\"}]\n\n* drawTableCardCells\n  | resultCell view:table row col value\n  id = @table + @row + @col\n  rowId = \"row\" + @table + @row\n  [\"div\" {\"id\" id \"parent\" rowId \"ix\" col} value]\n\n* realViews\n  | editor|activeView view remote\n  | !editor|generatedView view\n\n* subs\n  | realViews view remote\n  recipient = \"Editor\"\n  alias = @remote + \"|\" + @view\n  asCells = true\n\n* remote|subscription\n  | editor|activeProgram remote\n  | remoteViewsToTrack recipient view alias asCells\n\n* remote|subscription\n  | subs remote view recipient alias asCells\n\n* editor|activeProgram\n  | tableCardProgram program\n  remote = \"editor|\" + @program\n\n* editor|activeView\n  | editor|activeProgram program remote\n  | editor|programView program view\n\n* editor|activeQuery\n  | editor|activeProgram program remote\n  | editor|programQuery program query\n\n* editor|activeInsertedFact\n  | editor|activeProgram remote program\n  | editor|insertedFact program view row col value\n\n* remote|insertedFact\n  | editor|activeInsertedFact view remote row col value\n\n* remote\n  | editor|activeProgram remote\n\n* remote|view\n  | editor|activeView view remote\n  | editor|view view\n\n* remote|query\n  | editor|activeQuery query remote\n  | editor|query view query ix\n\n* remote|query\n  | remote|view view remote\n  | editor|query view query ix\n\n* remote|field\n  | remote|view view remote\n  | editor|field field view ix\n\n* remote|constantConstraint\n  | remote|query query remote\n  | editor|constantConstraint query field value\n\n* remote|functionConstraint\n  | remote|query query remote\n  | editor|functionConstraint constraint query field code\n\n* remote|functionConstraintInput\n  | remote|functionConstraint constraint remote\n  | editor|functionConstraintInput constraint field variable\n\n* remote|viewConstraint\n  | remote|query query remote\n  | editor|viewConstraint constraint query sourceView isNegated\n\n* remote|viewConstraintBinding\n  | remote|viewConstraint constraint remote\n  | editor|viewConstraintBinding constraint field sourceField\n\n* remote|aggregateConstraint\n  | remote|query query remote\n  | editor|aggregateConstraint constraint query field sourceView code\n\n* remote|aggregateConstraintBinding\n  | remote|aggregateConstraint constraint remote\n  | editor|aggregateConstraintBinding constraint field sourceField\n\n* remote|aggregateConstraintSolverInput\n  | remote|aggregateConstraint constraint remote\n  | editor|aggregateConstraintSolverInput constraint field variable\n\n* remote|aggregateConstraintAggregateInput\n  | remote|aggregateConstraint constraint remote\n  | editor|aggregateConstraintAggregateInput constraint sourceField variable\n\n* remote|isInput\n  | remote|view view remote\n  | editor|isInput view\n\n* remote|isCheck\n  | remote|view view remote\n  | editor|isCheck view\n",
  "Tutorial": "; This is a wireframe version of a textual editor for Eve. Ultimately, \n; this is unlikely to be how people interact with the system, but it \n; gives us an opportunity to work with the language before the real \n; workflow has fully come together and test the language in fun and \n; interesting ways.\n\n; Eve is based on datalog, but you can think of it more as a non-crappy \n; SQL. As such, the operations you have available to you look and feel \n; like relational algebra. As a matter of fact, everything in Eve is \n; just a view over some inputs. Let's see how we define a view:\n\n* user\n  ~ name age\n  + \"Chris\" 27\n  \n; The * denotes a new view. The symbol that follows it is its name. \n; You'll also notice that there's a table card on the right. Based on\n; that card, you can see that the first is defining the headers of \n; the view, the second adds a single row with the name \"Chris\" and the \n; age 27. Let's see how we use that information in another view to \n; calculate when I was born by uncommenting the code below:\n\n;* yearBorn\n;  | user age\n;  born = 2014 - @age\n\n; Here we've defined \"yearBorn\", which selects the age from the \"user\" \n; view and then calculates a new column called \"born\". Everything after\n; an equals sign is a javascript function right, so in order to \n; denote the we want the value of the age column, not some random\n; bit of js, we precede the symbol with an @. This allows you to do\n; the equivalent of formulas in Excel.\n\n; Also like Excel, everything in Eve is live - this is one of the \n; benefits we get from everything being a view. Try adding a new name \n; and age to the user view and see what happens. You'll see that all \n; the views update and now have multiple rows. But right now, our\n; information is in two different tables. Let's see how we can join \n; the yearBorn and user view together:\n\n;* userBorn\n;  | user name age\n;  | yearBorn age born\n  \n; Joins are implicit in Eve, which means columns referenced with the same\n; symbol are joined automatically. To have greater control over this, you \n; can alias fields by doing column:alias like so:\n\n;* userBornAlias\n;  | user name age:a\n;  | yearBorn age:a born:birthYear\n  \n; You can also filter your views by a value using column=value:\n\n;* peopleAged27\n;  | user name age=27\n\n; Only being able to filter by constants would be fairly limiting though, \n; so you can also filter via a javascript function that returns true or \n; false using the ? operator:\n\n;* peopleOlderThan 25\n;  | user name age\n;  ? @age > 25\n\n; So that lets us do the standard relational operations, but we're missing\n; a way to calculate over a set of rows (e.g. to sum something or take\n; the average). For example, let's see how we would calculate the average \n; age of our users:\n\n;* averageAge\n;  > user | age = avg(@user.age)\n  \n; The > denotes that we're doing an aggregation, taking lots of rows and \n; turning them into a single value. We name that value \"age\" in this case \n; and set it equal to a function that takes the average of the age column\n; in the user table. Note that if we had used @age instead of @user.age \n; it would mean the age field in the current view as opposed to the \n; age field in the table we're aggregating over.\n\n; One other thing we added syntax for is UI since it's pretty common in \n; applications. We represent HTML as nested lists denoted by\n; enclosing brackets like so:\n\n;* drawUsers\n;  | user name age\n;  [\"p\" {\"id\" name} name \" is \" age \" years old.\"]\n\n; You'll note at the top of our stack of cards that a UI card has now \n; appeared and that there are lines for each user in the user table. \n; In order to get a line per user, we needed to make each paragraph \n; unique by giving it an id as Eve has set semantics. The second element \n; of a UI list can be a map of attributes. The first is the type of HTML \n; tag and everything else is interpreted as a child. You can nest these \n; lists to your heart's content.\n  \n; And that's more or less it. The entire language is just stringing these\n; views together in interesting ways. Checkout the various examples to get\n; a feel for how these things start to come together and see some more\n; advanced notions like views that have multiple contributors (which\n; allows you to do recursion).\n  ",
  "Incrementer": ";*****************************************************\n; An incrementer button\n;*****************************************************\n\n* increment button\n  > event label=\"increment\" | clicks = count(@event.eid)\n  [\"button\" {\"click\" \"increment\"}\n    \"I've been clicked \" clicks \" times.\"]",
  "Net worth": ";;***********************************************\n;; Net worth example\n;;***********************************************\n\n* netWorth\n  year = 2014\n  rate = 0.02\n  principle = 100000\n \n* netWorthRecurse\n  | netWorth year:prev principle:pr rate\n  year = @prev + 1\n  ? @year < 2030\n  principle = (@pr * (1 + @rate)).toFixed(2)\n\n* netWorth\n  | netWorthRecurse year principle rate",
  "Department heads": ";*************************************\n; Department heads\n;*************************************\n\n* employee\n  ~ name department salary\n  + \"jamie\" \"engineering\" 75000\n  + \"chris\" \"engineering\" 75000\n  + \"rob\" \"operations\" 75000\n \n* heads\n  ~ name department \n  + \"chris\" \"engineering\"\n  + \"harry\" \"magic\"\n  + \"rob\" \"operations\"\n \n* totals \n  | heads name department\n  > employee department | cost = sum(@employee.salary)\n \n* average salary\n  > employee | average = avg(@employee.salary)",
  "TodoMVC": ";;*************************************************\n;; Todo views\n;;*************************************************\n\n* todosText\n  | todosOverTime id\n  > todosOverTime id | todo = maxBy(@todosOverTime.todo, @todosOverTime.time, \"\")\n\n* todos\n  | todosText id todo\n  | todosActive id isActive\n  | !removedTodos id \n* todos\n  | todosText id todo\n  | !todosActive id\n  | !removedTodos id\n  isActive = \"active\"\n  \n* visibleTodos\n  | todosToDraw id\n  | todos id todo isActive \n  | todoEditing id\n  editing = \"true\"\n* visibleTodos\n  | todosToDraw id\n  | todos id todo isActive\n  | !todoEditing id\n  editing = \"false\"\n  \n* remainingTodos\n  | todos id isActive=\"active\" \n* completedTodos\n  | todos id isActive=\"completed\" \n  \n;;*************************************************\n;; Events\n;;*************************************************\n\n* addedTodos\n  | event label=\"keydown\" eid value\n  | keyboard eid keyCode=13 \n  time = @eid\n* todosOverTime\n  | addedTodos value:todo eid:id time\n\n* todosToDraw\n  | todos isActive:f id\n  | filter filter:f\n* todosToDraw2\n  | todos id\n  | filter filter\n  filter = \"all\"\n* todosToDraw\n  | todosToDraw2 id filter:f\n \n* filter\n  > event label=\"set filter\" | filter = maxBy(@event.key, @event.eid, \"all\")\n  \n* toggleAllTemp\n  | event label=\"toggle-all\" eid\n  > event label=\"toggle-all\" | curToggle = count(@event.eid)\n;;TODO figure out how to make toggle-all do the right thing\n\n* toggles\n  | event label=\"toggle active\" key\n  > event label=\"toggle active\" key | total = count(@event.eid)\n  > event label=\"toggle active\" key | lastEid = maxBy(@event.eid, @event.eid, 0)\n  isActive = @total % 2 === 0 ? \"active\" : \"completed\"\n* todosActive\n  | toggles isActive key:id\n  \n* editedTodos\n  | event label=\"edit todo\" eid key value\n  | keyboard eid keyCode=13 \n* todosOverTime\n  | editedTodos value:todo key:id eid:time\n  \n* removeEvents\n  | event label=\"remove todo\" key:id \n* removedTodos\n  | removeEvents id\n* removeCompleted\n  | event label=\"remove completed\" eid\n  | toggles lastEid key:id isActive=\"completed\"\n  ? @lastEid < @eid\n* removedTodos\n  | removeCompleted id\n  \n* todoEditing1\n  | event label=\"edit todo\" key:id\n  | !event label=\"done editing\" key:id\n* todoEditing2\n  | event label=\"edit todo\" key:id eid:open\n  | event label=\"done editing\" key:id eid:close\n  ? @open > @close\n* todoEditing\n  | todoEditing1 id\n* todoEditing\n  | todoEditing2 id\n\n;;*************************************************\n;; Drawing \n;;*************************************************\n\n* draw todos\n  | visibleTodos id todo isActive editing=\"false\"\n  uiId = \"todo\" + @id\n  checked = @isActive === \"active\" ? \"false\" : \"checked\"\n  klass = @isActive === \"active\" ? \"active\" : \"completed\"\n  [\"li\" {\"class\" klass \"id\" uiId \"parent\" \"todo-list\" \"doubleClick\" \"edit todo\" \"key\" id \"ix\" id}\n    [\"input\" {\"type\" \"checkbox\" \"checked\" checked \"click\" \"toggle active\" \"key\" id}]\n    [\"label\" todo]\n    [\"button\" {\"click\" \"remove todo\" \"key\" id}]]\n    \n* draw editing todos\n  | visibleTodos id todo isActive editing=\"true\"\n  uiId = \"todo\" + @id + \"-editor\"\n  [\"li\" {\"id\" uiId \n         \"parent\" \"todo-list\" \n         \"ix\" id}\n    [\"input\" {\"type\" \"text\" \"class\" \"todo-editor\" \"keyDown\" \"edit todo\" \"blur\" \"done editing\" \"key\" id \"value\" todo}]]\n    \n* draw todos left\n  > remainingTodos | remaining = count(@remainingTodos.id)\n  ? @remaining > 0\n  remainingText = @remaining === 1 ? \" todo left\" : \" todos left\"\n  [\"span\" {\"class\" \"todo-count\" \"parent\" \"footer\" \"ix\" \"-1\"} \n    [\"strong\" remaining] remainingText]\n  \n* draw remove completed\n  > completedTodos | completed = count(@completedTodos.id)\n  ? @completed > 0\n  [\"button\" {\"class\" \"clear-completed\" \"click\" \"remove completed\" \"parent\" \"footer\" \"ix\" 2} \"Clear completed (\" completed \")\"]\n\n* todomvc\n  | filter filter\n  allClass = @filter === \"all\" ? \"active\" : \"\"\n  activeClass = @filter === \"active\" ? \"active\" : \"\"\n  completedClass = @filter === \"completed\" ? \"active\" : \"\"\n  [\"div\" {\"class\" \"running-wrapper\"}\n    [\"div\" {\"class\" \"todoapp\"}\n      [\"h1\" \"Todos\"]\n      [\"header\" \n        [\"input\" {\"type\" \"checkbox\" \"class\" \"toggle-all\" \"click\" \"toggle-all\"}]\n        [\"input\" {\"type\" \"text\" \"class\" \"new-todo\" \"placeholder\" \"What needs to be done?\" \"keyDown\" \"keydown\"}]]\n      [\"ul\" {\"class\" \"todo-list\" \"id\" \"todo-list\"}]\n      [\"div\" {\"class\" \"footer\" \"id\" \"footer\"}\n        \n        [\"ul\" {\"class\" \"filters\" \"id\" \"filters-list\"}\n          [\"li\" [\"button\" {\"class\" allClass \"click\" \"set filter\" \"key\" \"all\"} \"all\"]]\n          [\"li\" [\"button\" {\"class\" activeClass \"click\" \"set filter\" \"key\" \"active\"} \"active\"]]\n          [\"li\" [\"button\" {\"class\" completedClass \"click\" \"set filter\" \"key\" \"completed\"} \"completed\"]]\n          ]]\n        ]]",
  "Turing machine": "; --- input ---\n\n* machinePositionInput\n  ~ time position\n  + 0 0\n\n* machineStateInput\n  ~ time state\n  + 0 \"a\"\n\n* transition\n  ~ oldState oldSymbol write move newState\n  + \"a\" \"x\" \"x\" \"left\" \"b\"\n  + \"a\" 0 0 \"right\" \"a\"\n  + \"a\" 1 1 \"right\" \"a\"\n  + \"b\" \"x\" 1 \"right\" \"c\"\n  + \"b\" 0 1 \"left\" \"c\"\n  + \"b\" 1 0 \"left\" \"b\"\n  + \"c\" \"x\" \"x\" \"left\" \"d\"\n  + \"c\" 0 0 \"right\" \"c\"\n  + \"c\" 1 1 \"right\" \"c\"\n  \n* initialWrite\n ~ position symbol\n + 0 0\n + 1 1\n + 2 1\n \n; --- code ---\n\n* machinePosition\n  | machinePositionInput time position\n\n* machineState\n  | machineStateInput time state\n\n* transitionTaken\n  | machinePosition time position\n  | machineState time state\n  > write position | symbol = lastBefore(@write.symbol, @write.time, @time, \"x\")\n  | transition oldState:state oldSymbol:symbol write move newState\n  \n* write\n  time = -1\n  | initialWrite position symbol\n  \n* write\n  | transitionTaken time position write:symbol\n  \n* changeState\n  | transitionTaken time newState\n  newTime = @time + 1\n* machineState\n  | changeState newTime:time newState:state\n\n* moveLeft\n  | transitionTaken time position move=\"left\"\n  newPosition = @position - 1\n  newTime = @time + 1\n* machinePosition\n  | moveLeft newTime:time newPosition:position\n\n* moveRight\n  | transitionTaken time position move=\"right\"\n  newPosition = @position + 1\n  newTime = @time + 1\n* machinePosition\n  | moveRight newTime:time newPosition:position\n  \n; --- output ---\n\n* tape\n  | write position\n  > write position | symbol = maxBy(@write.symbol, @write.time)\n ",
  "Graph paths": ";*************************************\n; Path example\n;*************************************\n\n* edge\n  ~ from to\n  + \"a\" \"b\"\n  + \"b\" \"c\"\n  + \"c\" \"d\"\n\n* path\n  | edge from to\n\n* path2\n  | edge from to:t\n  | path from:t to\n\n* path\n  | path2 from to ",
  "Clock": ";*****************************************************\n; A clock\n;*****************************************************\n\n* timer\n ~ id event rate\n + \"tick\" 3 1000\n \n* clock \n  | time time:startTime\n  > event label=\"tick\" | value = maxBy(@event.value, @event.value, @startTime)\n  hours = hours(@value)\n  minutes = minutes(@value)\n  seconds = seconds(@value)\n\n* draw clock\n  | clock hours minutes seconds\n  secondsAngle = (@seconds * 6 - 90) * (Math.PI / 180)\n  secondsX = cos(@secondsAngle) * 95 + 102\n  secondsY = sin(@secondsAngle) * 95 + 102\n  minutesAngle = (@minutes * 6 - 90) * (Math.PI / 180)\n  minutesX = cos(@minutesAngle) * 90 + 102\n  minutesY = sin(@minutesAngle) * 90 + 102\n  hoursAngle = (@hours * 30 - 90) * (Math.PI / 180)\n  hoursX = cos(@hoursAngle) * 75 + 102\n  hoursY = sin(@hoursAngle) * 75 + 102\n  [\"svg\" {\"width\" 205 \"height\" 205}\n    [\"circle\" {\"cx\" 102 \"cy\" 102 \"r\" 100 \"style\" \"stroke:black; fill:#f7f7f7;\"}]\n    [\"line\" {\"x1\" 100 \"y1\" 100 \"x2\" secondsX \"y2\" secondsY \"style\" \"stroke:red; stroke-width:2px;\"}]\n    [\"line\" {\"x1\" 100 \"y1\" 100 \"x2\" minutesX \"y2\" minutesY \"style\" \"stroke:black; stroke-width:3px;\"}]\n    [\"line\" {\"x1\" 100 \"y1\" 100 \"x2\" hoursX \"y2\" hoursY \"style\" \"stroke:black; stroke-width:4px;\"}]]"
}
