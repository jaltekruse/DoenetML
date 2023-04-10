import cssesc from 'cssesc';

function cesc(s) {
  s = cssesc(s, { isIdentifier: true });
  if (s.slice(0, 2) === '\\#') {
    s = s.slice(1);
  }
  return s;
}

describe('Text Tag Tests', function () {

  beforeEach(() => {
    cy.clearIndexedDB();
    cy.visit('/src/Tools/cypressTest/')

  })

  it('spaces preserved between tags', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <p><text>Hello</text> <text>there</text>!</p>

    <p><text>We <text>could</text> be <copy target="_text2" />.</text></p>
    `}, "*");
    });

    cy.get('p#\\/_p1').invoke('text').should('contain', 'Hello there!')
    cy.get('p#\\/_p2').invoke('text').should('contain', 'We could be there.')

  })

  it('components adapt to text', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <p>boolean: <text><boolean>true</boolean></text></p>
    <p>number: <text><number>5-2</number></text></p>
    <p>math: <text><math>5-2</math></text></p>
    `}, "*");
    });

    cy.get('#\\/_text1').should('have.text', 'true')
    cy.get('#\\/_text2').should('have.text', '3')
    cy.get('#\\/_text3').should('have.text', '5 - 2')

  })

  it('text from paragraph components', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <p name="orig"><q>Hello,</q> said the <em>cow</em>.  <sq>Bye,</sq> came the <alert>reply</alert>.  The <attr>text</attr> attribute of <tag>text</tag> or <tage>text</tage> doesn't <term>do</term> <c>much</c>.</p>

    <p name="textOnly"><copy prop="text" target="orig" assignNames="t" /></p>

    <p name="insideText"><text name="t2"><q>Hello,</q> said the <em>cow</em>.  <sq>Bye,</sq> came the <alert>reply</alert>.  The <attr>text</attr> attribute of <tag>text</tag> or <tage>text</tage> doesn't <term>do</term> <c>much</c>.</text></p>
    `}, "*");
    });

    cy.get('#\\/orig').should('have.text', `“Hello,” said the cow.  ‘Bye,’ came the reply.  The text attribute of <text> or <text/> doesn't do much.`)
    cy.get('#\\/textOnly').should('have.text', `"Hello," said the cow.  'Bye,' came the reply.  The text attribute of <text> or <text/> doesn't do much.`)
    cy.get('#\\/insideText').should('have.text', `"Hello," said the cow.  'Bye,' came the reply.  The text attribute of <text> or <text/> doesn't do much.`)

    cy.window().then(async (win) => {
      let stateVariables = await win.returnAllStateVariables1();
      expect(stateVariables['/t'].stateValues.value).eq(`"Hello," said the cow.  'Bye,' came the reply.  The text attribute of <text> or <text/> doesn't do much.`)
      expect(stateVariables['/t2'].stateValues.value).eq(`"Hello," said the cow.  'Bye,' came the reply.  The text attribute of <text> or <text/> doesn't do much.`)
    })


  })

  it('text from single character components', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <p name="orig">Pick a <lsq/>number<rsq/> from 1 <ndash/> 2 <mdash/> no, <lq/>maybe<rq/> from<nbsp/>3<ellipsis /></p>

    <p name="textOnly"><copy prop="text" target="orig" assignNames="t" /></p>

    <p name="insideText"><text name="t2">Pick a <lsq/>number<rsq/> from 1 <ndash/> 2 <mdash/> no, <lq/>maybe<rq/> from<nbsp/>3<ellipsis /></text></p>
    `}, "*");
    });

    cy.get('#\\/orig').should('have.text', 'Pick a ‘number’ from 1 – 2 — no, “maybe” from\u00a03…')
    cy.get('#\\/textOnly').should('have.text', 'Pick a ‘number’ from 1 – 2 — no, “maybe” from\u00a03…')
    cy.get('#\\/insideText').should('have.text', 'Pick a ‘number’ from 1 – 2 — no, “maybe” from\u00a03…')

    cy.window().then(async (win) => {
      let stateVariables = await win.returnAllStateVariables1();
      expect(stateVariables['/t'].stateValues.value).eq(`Pick a ‘number’ from 1 – 2 — no, “maybe” from\u00a03…`)
      expect(stateVariables['/t2'].stateValues.value).eq(`Pick a ‘number’ from 1 – 2 — no, “maybe” from\u00a03…`)
    })


  })

  it('text does not force composite replacement, even in boolean', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <text>a</text>
    <boolean>
      <text>$nothing</text> = <text></text>
    </boolean>
    ` }, "*");
    });

    cy.get('#\\/_text1').should('have.text', 'a');  // to wait until loaded

    cy.log('Test value displayed in browser')
    cy.get('#\\/_boolean1').should('have.text', 'true')

  })

  it('text in graph', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <text>a</text>
    <graph >
      <text anchor="$anchorCoords1" name="text1" positionFromAnchor="$positionFromAnchor1" draggable="$draggable1">$content1</text>
      <text name="text2">bye</text>
    </graph>

    <p name="pAnchor1">Anchor 1 coordinates: $text1.anchor</p>
    <p name="pAnchor2">Anchor 2 coordinates: $text2.anchor</p>
    <p name="pChangeAnchor1">Change anchor 1 coordinates: <mathinput name="anchorCoords1" prefill="(1,3)" /></p>
    <p name="pChangeAnchor2">Change anchor 2 coordinates: <mathinput name="anchorCoords2" bindValueTo="$text2.anchor" /></p>
    <p name="pPositionFromAnchor1">Position from anchor 1: $text1.positionFromAnchor</p>
    <p name="pPositionFromAnchor2">Position from anchor 2: $text2.positionFromAnchor</p>
    <p>Change position from anchor 1
    <choiceinput inline preselectChoice="1" name="positionFromAnchor1">
      <choice>upperRight</choice>
      <choice>upperLeft</choice>
      <choice>lowerRight</choice>
      <choice>lowerLeft</choice>
      <choice>left</choice>
      <choice>right</choice>
      <choice>top</choice>
      <choice>bottom</choice>
      <choice>center</choice>
    </choiceinput>
    </p>
    <p>Change position from anchor 2
    <choiceinput inline name="positionFromAnchor2" bindValueTo="$text2.positionFromAnchor">
      <choice>upperRight</choice>
      <choice>upperLeft</choice>
      <choice>lowerRight</choice>
      <choice>lowerLeft</choice>
      <choice>left</choice>
      <choice>right</choice>
      <choice>top</choice>
      <choice>bottom</choice>
      <choice>center</choice>
    </choiceinput>
    </p>
    <p name="pDraggable1">Draggable 1: $draggable1</p>
    <p name="pDraggable2">Draggable 2: $draggable2</p>
    <p>Change draggable 1 <booleanInput name="draggable1" prefill="true" /></p>
    <p>Change draggable 2 <booleanInput name="draggable2" bindValueTo="$text2.draggable" /></p>
    <p name="pContent1">Content 1: $text1</p>
    <p name="pContent2">Content 2: $text2</p>
    <p>Content 1 <textinput name="content1" prefill="hello" /></p>
    <p>Content 2 <textinput name="content2" bindValueTo="$text2" /></p>
    <p><booleaninput name="bi" /> <boolean name="b" copySource="bi" /></p>

    ` }, "*");
    });

    cy.get('#\\/_text1').should('have.text', 'a');  // to wait until loaded

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', '(1,3)')
    cy.get('#\\/pAnchor2 .mjx-mrow').eq(0).should('have.text', '(0,0)')

    cy.get("#\\/pPositionFromAnchor1").should('have.text', 'Position from anchor 1: upperright')
    cy.get("#\\/pPositionFromAnchor2").should('have.text', 'Position from anchor 2: center')
    cy.get("#\\/positionFromAnchor1").should('have.value', '1')
    cy.get("#\\/positionFromAnchor2").should('have.value', '9')
    cy.get("#\\/pDraggable1").should('have.text', 'Draggable 1: true')
    cy.get("#\\/pDraggable2").should('have.text', 'Draggable 2: true')
    cy.get("#\\/pContent1").should('have.text', 'Content 1: hello')
    cy.get("#\\/pContent2").should('have.text', 'Content 2: bye')


    cy.log("move texts by dragging")

    cy.window().then(async (win) => {
      win.callAction1({
        actionName: "moveText",
        componentName: "/text1",
        args: { x: -2, y: 3 }
      })
      win.callAction1({
        actionName: "moveText",
        componentName: "/text2",
        args: { x: 4, y: -5 }
      })
    })

    cy.get('#\\/pAnchor2 .mjx-mrow').should('contain.text', '(4,−5)')

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', '(−2,3)')
    cy.get('#\\/pAnchor2 .mjx-mrow').eq(0).should('have.text', '(4,−5)')


    cy.log("move texts by entering coordinates")

    cy.get('#\\/anchorCoords1 textarea').type("{home}{shift+end}{backspace}(6,7){enter}", { force: true })
    cy.get('#\\/anchorCoords2 textarea').type("{home}{shift+end}{backspace}(8,9){enter}", { force: true })

    cy.get('#\\/pAnchor2 .mjx-mrow').should('contain.text', '(8,9)')

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', '(6,7)')
    cy.get('#\\/pAnchor2 .mjx-mrow').eq(0).should('have.text', '(8,9)')


    cy.log('change position from anchor');
    cy.get('#\\/positionFromAnchor1').select("lowerLeft")
    cy.get('#\\/positionFromAnchor2').select("lowerRight")

    cy.get("#\\/pPositionFromAnchor1").should('have.text', 'Position from anchor 1: lowerleft')
    cy.get("#\\/pPositionFromAnchor2").should('have.text', 'Position from anchor 2: lowerright')


    cy.log('make not draggable')

    cy.get('#\\/draggable1').click();
    cy.get('#\\/draggable2').click();
    cy.get("#\\/pDraggable1").should('have.text', 'Draggable 1: false')
    cy.get("#\\/pDraggable2").should('have.text', 'Draggable 2: false')


    cy.log('cannot move texts by dragging')
    cy.window().then(async (win) => {
      win.callAction1({
        actionName: "moveText",
        componentName: "/text1",
        args: { x: -10, y: -9 }
      })
      win.callAction1({
        actionName: "moveText",
        componentName: "/text2",
        args: { x: -8, y: -7 }
      })
    })

    // since nothing will change, wait for boolean input to change to know core has responded
    cy.get("#\\/bi").click();
    cy.get("#\\/b").should('have.text', 'true');

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', '(6,7)')
    cy.get('#\\/pAnchor2 .mjx-mrow').eq(0).should('have.text', '(8,9)')


    cy.log("change content of text")
    cy.get('#\\/content1_input').type("{end} there{enter}")
    cy.get('#\\/content2_input').type("{end} now{enter}")


    cy.get("#\\/pContent1").should('have.text', 'Content 1: hello there')
    cy.get("#\\/pContent2").should('have.text', 'Content 2: bye now')

  })

  it('text in graph, handle bad anchor coordinates', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <text>a</text>

    <graph >
      <text anchor="$anchorCoords1" name="text1">Hello</text>
    </graph>
    

    <p name="pAnchor1">Anchor 1 coordinates: $text1.anchor</p>
    <p name="pChangeAnchor1">Change anchor 1 coordinates: <mathinput name="anchorCoords1" prefill="x" /></p>
    

    `}, "*");
    });

    cy.get('#\\/_text1').should('have.text', 'a') //wait for page to load

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', 'x')


    cy.log("give good anchor coords")

    cy.get('#\\/anchorCoords1 textarea').type("{home}{shift+end}{backspace}(6,7){enter}", { force: true })

    cy.get('#\\/pAnchor1 .mjx-mrow').should('contain.text', '(6,7)')

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', '(6,7)')

    cy.log("give bad anchor coords again")

    cy.get('#\\/anchorCoords1 textarea').type("{home}{shift+end}{backspace}q{enter}", { force: true })

    cy.get('#\\/pAnchor1 .mjx-mrow').should('contain.text', 'q')

    cy.get('#\\/pAnchor1 .mjx-mrow').eq(0).should('have.text', 'q')


  });

  it('color text via style', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <setup>
      <styleDefinitions>
        <styleDefinition styleNumber="2" textColor="green" />
        <styleDefinition styleNumber="3" textColor="red" backgroundColor="blue" />
      </styleDefinitions>
    </setup>

    <p>Style number: <mathinput prefill="1" name="sn" /></p>

    <p><text name="no_style">One</text> is <text name="tsd_no_style">$no_style.textStyleDescription</text>, i.e., the text color is <text name="tc_no_style">$no_style.textColor</text> and the background color is <text name="bc_no_style">$no_style.backgroundColor</text>.</p>
    <p><text name="fixed_style" stylenumber="2">Two</text> is <text name="tsd_fixed_style">$fixed_style.textStyleDescription</text>, i.e., the text color is <text name="tc_fixed_style">$fixed_style.textColor</text> and the background color is <text name="bc_fixed_style">$fixed_style.backgroundColor</text>.</p>
    <p><text name="variable_style" stylenumber="$sn">Three</text> is <text name="tsd_variable_style">$variable_style.textStyleDescription</text>, i.e., the text color is <text name="tc_variable_style">$variable_style.textColor</text> and the background color is <text name="bc_variable_style">$variable_style.backgroundColor</text>.</p>

    <graph>
      $no_style{anchor="(1,2)"}
      $fixed_style{anchor="(3,4)"}
      $variable_style
    </graph>

    ` }, "*");
    });

    cy.get('#\\/tsd_no_style').should('have.text', 'black');
    cy.get('#\\/tc_no_style').should('have.text', 'black');
    cy.get('#\\/bc_no_style').should('have.text', 'none');

    cy.get('#\\/tsd_fixed_style').should('have.text', 'green');
    cy.get('#\\/tc_fixed_style').should('have.text', 'green');
    cy.get('#\\/bc_fixed_style').should('have.text', 'none');

    cy.get('#\\/tsd_variable_style').should('have.text', 'black');
    cy.get('#\\/tc_variable_style').should('have.text', 'black');
    cy.get('#\\/bc_variable_style').should('have.text', 'none');


    cy.get('#\\/no_style').should('have.css', 'color', 'rgb(0, 0, 0)');
    cy.get('#\\/no_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    cy.get('#\\/fixed_style').should('have.css', 'color', 'rgb(0, 128, 0)');
    cy.get('#\\/fixed_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    cy.get('#\\/variable_style').should('have.css', 'color', 'rgb(0, 0, 0)');
    cy.get('#\\/variable_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    // TODO: how to test color in graph


    cy.get('#\\/sn textarea').type("{end}{backspace}2{enter}", { force: true })

    cy.get('#\\/tsd_variable_style').should('have.text', 'green');
    cy.get('#\\/tc_variable_style').should('have.text', 'green');
    cy.get('#\\/bc_variable_style').should('have.text', 'none');

    cy.get('#\\/tsd_no_style').should('have.text', 'black');
    cy.get('#\\/tc_no_style').should('have.text', 'black');
    cy.get('#\\/bc_no_style').should('have.text', 'none');

    cy.get('#\\/tsd_fixed_style').should('have.text', 'green');
    cy.get('#\\/tc_fixed_style').should('have.text', 'green');
    cy.get('#\\/bc_fixed_style').should('have.text', 'none');

    cy.get('#\\/no_style').should('have.css', 'color', 'rgb(0, 0, 0)');
    cy.get('#\\/no_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    cy.get('#\\/fixed_style').should('have.css', 'color', 'rgb(0, 128, 0)');
    cy.get('#\\/fixed_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    cy.get('#\\/variable_style').should('have.css', 'color', 'rgb(0, 128, 0)');
    cy.get('#\\/variable_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');



    cy.get('#\\/sn textarea').type("{end}{backspace}3{enter}", { force: true })

    cy.get('#\\/tsd_variable_style').should('have.text', 'red with a blue background');
    cy.get('#\\/tc_variable_style').should('have.text', 'red');
    cy.get('#\\/bc_variable_style').should('have.text', 'blue');

    cy.get('#\\/tsd_no_style').should('have.text', 'black');
    cy.get('#\\/tc_no_style').should('have.text', 'black');
    cy.get('#\\/bc_no_style').should('have.text', 'none');

    cy.get('#\\/tsd_fixed_style').should('have.text', 'green');
    cy.get('#\\/tc_fixed_style').should('have.text', 'green');
    cy.get('#\\/bc_fixed_style').should('have.text', 'none');

    cy.get('#\\/no_style').should('have.css', 'color', 'rgb(0, 0, 0)');
    cy.get('#\\/no_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    cy.get('#\\/fixed_style').should('have.css', 'color', 'rgb(0, 128, 0)');
    cy.get('#\\/fixed_style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');

    cy.get('#\\/variable_style').should('have.css', 'color', 'rgb(255, 0, 0)');
    cy.get('#\\/variable_style').should('have.css', 'background-color', 'rgb(0, 0, 255)');


  })

  it('text copied by plain macro, but not value, reflects style and anchor position', () => {
    cy.window().then(async (win) => {
      win.postMessage({
        doenetML: `
    <setup>
      <styleDefinitions>
        <styleDefinition styleNumber="2" textColor="green" />
        <styleDefinition styleNumber="3" textColor="red" />
      </styleDefinitions>
    </setup>

    <text>a</text>

    <graph name="g1">
      <text styleNumber="2" name="t1">One</text>
      <text styleNumber="3" anchor="(3,4)" name="t2" >Two</text>
    </graph>

    <coords copySource="t1.anchor" name="t1coords" />
    <coords copySource="t2.anchor" name="t2coords" />

    <graph name="g2">
      $t1
      $t2
    </graph>

    <collect componentTypes="text" source="g2" prop="anchor" assignNames="t1acoords t2acoords" />

    <graph name="g3">
      $t1.value
      $t2.value
    </graph>

    <collect componentTypes="text" source="g3" prop="anchor" assignNames="t1bcoords t2bcoords" />

    <p name="p1">$t1 $t2</p>

    <p name="p2">$t1.value $t2.value</p>

    ` }, "*");
    });

    cy.get('#\\/_text1').should('have.text', 'a');  // to wait until loaded

    cy.window().then(async (win) => {
      let stateVariables = await win.returnAllStateVariables1();

      let t1aName = stateVariables["/g2"].activeChildren[0].componentName;
      let t2aName = stateVariables["/g2"].activeChildren[1].componentName;
      let t1bName = stateVariables["/g3"].activeChildren[0].componentName;
      let t2bName = stateVariables["/g3"].activeChildren[1].componentName;
      let t1cName = stateVariables["/p1"].activeChildren[0].componentName;
      let t2cName = stateVariables["/p1"].activeChildren[2].componentName;
      let t1dName = stateVariables["/p2"].activeChildren[0].componentName;
      let t2dName = stateVariables["/p2"].activeChildren[2].componentName;

      let t1cAnchor = '#' + cesc(t1cName);
      let t2cAnchor = '#' + cesc(t2cName);
      let t1dAnchor = '#' + cesc(t1dName);
      let t2dAnchor = '#' + cesc(t2dName);

      cy.get(t1cAnchor).should('have.text', 'One')
      cy.get(t1dAnchor).should('have.text', 'One')
      cy.get(t2cAnchor).should('have.text', 'Two')
      cy.get(t2dAnchor).should('have.text', 'Two')

      cy.get(t1cAnchor).should('have.css', 'color', 'rgb(0, 128, 0)');
      cy.get(t1dAnchor).should('have.css', 'color', 'rgb(0, 0, 0)');
      cy.get(t2cAnchor).should('have.css', 'color', 'rgb(255, 0, 0)');
      cy.get(t2dAnchor).should('have.css', 'color', 'rgb(0, 0, 0)');

      cy.get('#\\/t1coords .mjx-mrow').eq(0).should('have.text', '(0,0)')
      cy.get('#\\/t2coords .mjx-mrow').eq(0).should('have.text', '(3,4)')
      cy.get('#\\/t1acoords .mjx-mrow').eq(0).should('have.text', '(0,0)')
      cy.get('#\\/t2acoords .mjx-mrow').eq(0).should('have.text', '(3,4)')
      cy.get('#\\/t1bcoords .mjx-mrow').eq(0).should('have.text', '(0,0)')
      cy.get('#\\/t2bcoords .mjx-mrow').eq(0).should('have.text', '(0,0)')



      cy.log("move first texts")
      cy.window().then(async (win) => {
        win.callAction1({
          actionName: "moveText",
          componentName: "/t1",
          args: { x: -2, y: 3 }
        })
        win.callAction1({
          actionName: "moveText",
          componentName: "/t2",
          args: { x: 4, y: -5 }
        })
      })

      cy.get('#\\/t2coords .mjx-mrow').should('contain.text', '(4,−5)')

      cy.get('#\\/t1coords .mjx-mrow').eq(0).should('have.text', '(−2,3)')
      cy.get('#\\/t2coords .mjx-mrow').eq(0).should('have.text', '(4,−5)')
      cy.get('#\\/t1acoords .mjx-mrow').eq(0).should('have.text', '(−2,3)')
      cy.get('#\\/t2acoords .mjx-mrow').eq(0).should('have.text', '(4,−5)')
      cy.get('#\\/t1bcoords .mjx-mrow').eq(0).should('have.text', '(0,0)')
      cy.get('#\\/t2bcoords .mjx-mrow').eq(0).should('have.text', '(0,0)')


      cy.log("move second texts")
      cy.window().then(async (win) => {
        win.callAction1({
          actionName: "moveText",
          componentName: t1aName,
          args: { x: 7, y: 1 }
        })
        win.callAction1({
          actionName: "moveText",
          componentName: t2aName,
          args: { x: -8, y: 2 }
        })
      })

      cy.get('#\\/t2coords .mjx-mrow').should('contain.text', '(−8,2)')

      cy.get('#\\/t1coords .mjx-mrow').eq(0).should('have.text', '(7,1)')
      cy.get('#\\/t2coords .mjx-mrow').eq(0).should('have.text', '(−8,2)')
      cy.get('#\\/t1acoords .mjx-mrow').eq(0).should('have.text', '(7,1)')
      cy.get('#\\/t2acoords .mjx-mrow').eq(0).should('have.text', '(−8,2)')
      cy.get('#\\/t1bcoords .mjx-mrow').eq(0).should('have.text', '(0,0)')
      cy.get('#\\/t2bcoords .mjx-mrow').eq(0).should('have.text', '(0,0)')


      cy.log("move third texts")
      cy.window().then(async (win) => {
        win.callAction1({
          actionName: "moveText",
          componentName: t1bName,
          args: { x: -6, y: 3 }
        })
        win.callAction1({
          actionName: "moveText",
          componentName: t2bName,
          args: { x: -5, y: -4 }
        })
      })

      cy.get('#\\/t2bcoords .mjx-mrow').should('contain.text', '(−5,−4)')

      cy.get('#\\/t1coords .mjx-mrow').eq(0).should('have.text', '(7,1)')
      cy.get('#\\/t2coords .mjx-mrow').eq(0).should('have.text', '(−8,2)')
      cy.get('#\\/t1acoords .mjx-mrow').eq(0).should('have.text', '(7,1)')
      cy.get('#\\/t2acoords .mjx-mrow').eq(0).should('have.text', '(−8,2)')
      cy.get('#\\/t1bcoords .mjx-mrow').eq(0).should('have.text', '(−6,3)')
      cy.get('#\\/t2bcoords .mjx-mrow').eq(0).should('have.text', '(−5,−4)')



    })
  })

})



