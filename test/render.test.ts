import { expect } from "chai"
import { CssLoader } from "../src/loader"
import { Registry } from "../src/registry"
import { newStyle } from "../src/style"


describe("Test css rendering", () => {
    it(":placeholder", () => {
        let loader = new CssLoader()
        loader.load(`
            .input:placeholder                  { width: 10px; height: 20px; }
            .input::-webkit-input-placeholder   { width: 10px; height: 20px; }
            .input::-moz-placeholder            { width: 10px; height: 20px; }
            .input:-moz-placeholder             { width: 10px; height: 20px; }
            .input:-ms-input-placeholder        { width: 10px; height: 20px; }
            `)

        let registry = new Registry("global")
        let style = newStyle(registry, loader)

        expect(style("input")).to.eql("a b")
        expect(registry.renderCss()[0].content).to.eql(`.a::-webkit-input-placeholder{width:10px}.a::-moz-placeholder{width:10px}.a:-moz-placeholder{width:10px}.a:-ms-input-placeholder{width:10px}.a:placeholder{width:10px}.b::-webkit-input-placeholder{height:20px}.b::-moz-placeholder{height:20px}.b:-moz-placeholder{height:20px}.b:-ms-input-placeholder{height:20px}.b:placeholder{height:20px}`)
    })

    it("@font-face", () => {
        let loader: any = new CssLoader()
        loader.load(`
            @font-face {
                font-family: FontFamilyName;
                font-weight: 300;
                font-style: normal;
                src: local(Arial);
            }
        `)

        let registry = new Registry("global")
        let style = newStyle(registry, loader)
        let rendered = registry.renderCss()[0]

        expect(rendered.content).to.eql(`@font-face{font-family:FontFamilyName;font-weight:300;font-style:normal;src:local(Arial);}`)

    })
})
