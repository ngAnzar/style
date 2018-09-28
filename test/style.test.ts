import { expect } from "chai"
import { CssLoader } from "../src/loader"
import { Registry } from "../src/registry"
import { newStyle } from "../src/style"


describe("Test newStyle funcionality", () => {
    it("Basic test", () => {
        let loader = new CssLoader()
        loader.load(`.hello { width: 10px; height: 20px; } .world { font-size:12px }`)

        let registry = new Registry("global")
        let style = newStyle(registry, loader)

        expect(style("hello world")).to.eql("a b c")
        expect(registry.renderCss()[0].content).to.eql(`.a{width:10px}.b{height:20px}.c{font-size:12px}`)
    })

    it("Multiple registry", () => {
        let loader = new CssLoader()
        loader.load(`
            .hello { width: 10px; height: 20px; }
            .world { font-size:12px }
            .loader { z-index: 20; }`)

        let critical = new Registry("critical")
        let registry = new Registry("style")
        registry.addDependency(critical)

        let style = newStyle(registry, loader)

        expect(style.critical("hello")).to.eql("a b")
        expect(style.critical("loader")).to.eql("c")

        expect(style("hello world")).to.eql("a b d")
        expect(style("loader")).to.eql("c")

        expect(critical.renderCss()[0].content).to.eql(`.a{width:10px}.b{height:20px}.c{z-index:20}`)
        expect(registry.renderCss()[0].content).to.eql(`.d{font-size:12px}`)
    })

    it("Immutable className", () => {
        let loader = new CssLoader()
        loader.load(`
            .hello { width: 10px; height: 20px; }
            .hello div { font-size:12px }
            .loader { z-index: 20; }`)

        let registry = new Registry("style")
        registry.canMangleName = (selector) => {
            if (selector.nodes.length) {
                let primary = selector.nodes[0]
                return primary.type === "class" && primary.name !== "hello"
            }
            return true
        }

        let style = newStyle(registry, loader)

        expect(style("hello")).to.eql("hello")
        expect(style("loader")).to.eql("a")

        expect(registry.renderCss()[0].content).to.eql(`.hello{width:10px}.hello{height:20px}.hello div{font-size:12px}.a{z-index:20}`)
    })

    it("Immutable className 2", () => {
        let loader = new CssLoader()
        loader.load(`
            .hello { width: 10px; height: 20px; }
            .hello div { font-size:12px }
            .almafa { width: 10px }
            .almafa test { width: 50px }
            .toki { width: 10px }
            .loader { z-index: 20; }`)

        let registry = new Registry("style")
        registry.canMangleName = (selector) => {
            if (selector.nodes.length) {
                let primary = selector.nodes[0]
                return primary.type === "class" && primary.name !== "hello"
            }
            return true
        }

        let style = newStyle(registry, loader)

        expect(style("hello")).to.eql("hello")
        expect(style("loader almafa")).to.eql("a b c")
        expect(style("toki")).to.eql("b")
        expect(style("hello")).to.eql("hello")

        expect(registry.renderCss()[0].content).to.eql(`.hello,.b{width:10px}.hello{height:20px}.hello div{font-size:12px}.a{z-index:20}.c test{width:50px}`)
    })
})
