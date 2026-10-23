"""Browser regression: real audit controls, delayed cache echoes, no owner writes.

Run with python3 <this file> while the preview is running on localhost:8080.
"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 1800})
        # Isolate the actual field controls from the app, auth and save manager.
        await page.route("http://localhost:8080/buffer-regression", lambda route: route.fulfill(
            content_type="text/html", body='<div id="controls"></div>'))
        await page.goto("http://localhost:8080/buffer-regression")
        await page.evaluate("""async () => {
          const Refresh = (await import("/@react-refresh")).default;
          Refresh.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => type => type;
          window.__vite_plugin_react_preamble_installed__ = true;
          const React = await import('/node_modules/.vite/deps/react.js');
          const {createRoot} = await import('/node_modules/.vite/deps/react-dom_client.js');
          const {QueryClient, QueryClientProvider, useQuery} = await import('/node_modules/.vite/deps/@tanstack_react-query.js');
          const {TextField, ScriptField, NumberField, ChoiceField, MultiField} = await import('/src/tools/sales-operating-system-audit/components/fields/Fields.tsx');
          const {UploadField} = await import('/src/tools/sales-operating-system-audit/components/fields/UploadField.tsx');
          const qc = new QueryClient();
          qc.setQueryData(['buffer-regression'], {text:'abcdef', script:'abcdef', number:12345, choice:{key:'other',other:'abcdef'}, multi:{keys:['other'],other:'abcdef'}});
          window.changes = [];
          window.external = (key, value) => qc.setQueryData(['buffer-regression'], old => ({...old,[key]:value}));
          function Controls() {
            const {data} = useQuery({queryKey:['buffer-regression'], queryFn:()=>({}), staleTime:Infinity});
            const change = key => value => {
              window.changes.push([key,value]);
              window.external(key,value);
            };
            const h = React.createElement;
            const upload = {id:'test', prompt:'Upload', fields:[]};
            return h('div', null,
              h(TextField,{label:'Text',value:data.text,onChange:change('text')}),
              h(ScriptField,{label:'Script',value:data.script,onChange:change('script')}),
              h(NumberField,{label:'Number',value:data.number,onChange:change('number'),estimate:false,onEstimateChange:()=>{}}),
              h('div',{'data-testid':'choice'},h(ChoiceField,{options:[],allowOther:true,value:data.choice,onChange:change('choice')})),
              h('div',{'data-testid':'multi'},h(MultiField,{options:[],allowOther:true,value:data.multi,onChange:change('multi')})),
              h(UploadField,{question:upload,field:{type:'upload',key:'files'},api:{answer:{value:{},estimates:{},marker:null},setFieldValue:change('files'),setEstimate:()=>{},setMarker:()=>{}}}),
              h('button',{type:'button'},'Outside'));
          }
          createRoot(document.getElementById('controls')).render(React.createElement(QueryClientProvider,{client:qc},React.createElement(Controls)));
        }""")

        async def middle_edit(control, initial, expected, position=3, insert="X"):
            await control.fill(initial)
            await control.evaluate("(el, position) => el.setSelectionRange(position, position)", position)
            await control.press(insert)
            assert await control.input_value() == expected
            assert await control.evaluate("el => el.selectionStart") == position + 1
            await page.wait_for_timeout(30)
            assert await control.input_value() == expected
            assert await control.evaluate("el => el.selectionStart") == position + 1

        await middle_edit(page.get_by_role("textbox", name="Text", exact=True), "abcdef", "abcXdef")
        await middle_edit(page.get_by_role("textbox", name="Script", exact=True), "abcdef", "abcXdef")
        for group in ["choice", "multi"]:
            await middle_edit(page.get_by_test_id(group).get_by_role("textbox"), "abcdef", "abcXdef")
        number = page.get_by_role("textbox", name="Number", exact=True)
        await middle_edit(number, "12345", "123945", insert="9")
        await number.fill("1.")
        await page.wait_for_timeout(30)
        assert await number.input_value() == "1."
        assert await page.evaluate("window.changes.at(-1)") == ["number", 1]
        await number.fill("")
        assert await number.input_value() == ""
        assert await page.evaluate("window.changes.at(-1)") == ["number", None]

        text = page.get_by_role("textbox", name="Text", exact=True)
        await text.focus()
        await page.evaluate("window.external('text', 'external value')")
        await page.wait_for_timeout(30)
        assert await text.input_value() == "abcXdef", "Focused text must ignore external echoes"
        await page.get_by_role("button", name="Outside", exact=True).click()
        await page.wait_for_timeout(30)
        assert await text.input_value() == "external value", "Blur must adopt the current prop"
        await page.evaluate("window.external('text', 'unfocused update')")
        await page.wait_for_timeout(30)
        assert await text.input_value() == "unfocused update"

        await page.get_by_role("button", name="Add link", exact=True).click()
        await middle_edit(page.get_by_role("textbox", name="Link", exact=True), "https://example.com/abcdef", "https://example.com/abcXdef", position=23)
        await middle_edit(page.get_by_role("textbox", name="Name (optional)", exact=True), "abcdef", "abcXdef")
        await page.get_by_role("button", name="Add link", exact=True).click()
        saved = await page.evaluate("window.changes.at(-1)")
        assert saved[0] == "files"
        assert saved[1]["items"][0]["url"] == "https://example.com/abcXdef"
        assert saved[1]["items"][0]["name"] == "abcXdef"
        await page.screenshot(path="/tmp/browser/buffered-inputs.png")
        print("PASS: middle edits, caret positions, raw numbers, per-change setters, external/blur synchronization, Other and Add link controls; no owner writes")
        await browser.close()


asyncio.run(main())