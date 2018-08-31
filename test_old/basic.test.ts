import { expect } from "chai"
import { newStyle, Loader, Registry } from "../src"


describe("Define style with css text", () => {
	let style, loader, registry
	beforeEach(() => {
		loader = new Loader()
		registry = new Registry()
		style = newStyle(loader, registry)
	})


	it("One simple rule", () => {
		style.define(".test { width:10px }")
		expect(style.test).to.eql("a")
	})

	it("One rule with two property", () => {
		style.define(".test { width:10px; height:10px }")
		expect(style.test).to.eql("a b")
	})

	it("Two rules with different properties", () => {
		style.define(".test1 { width:  10px } .test2 { height: 10px }")
		expect(style.test1).to.eql("a")
		expect(style.test2).to.eql("b")
	})

	it("Merging same selectors", () => {
		style.define(".test { width:  10px } .test { height: 10px }")
		expect(style.test).to.eql("a b")
	})

	it("Merging same selectors v2", () => {
		style.define(".test, .button { width:  10px } .test { height: 10px } .button { color: red }")
		expect(style.test).to.eql("a b")
		expect(style.button).to.eql("a c")
	})

	describe("Advanced selectors", () => {
		it(":pseudo", () => {
			style.define(".test:hover { color: red }")
			expect(style.test).to.eql("a")
			expect(registry.toStyleSheet()).to.eql(".a:hover{color:red}")
		})

		it(":pseudo descendant", () => {
			style.define(".test:hover button { color: red }")
			expect(style.test).to.eql("a")
			expect(registry.toStyleSheet()).to.eql(".a:hover button{color:red}")
		})

		it(":pseudo descendant with more rules", () => {
			style.define(".test:hover button { color: red; background: white }")
			expect(style.test).to.eql("a b")
			expect(registry.toStyleSheet()).to.eql(".a:hover button{color:red}.b:hover button{background:white}")
		})

		it("Media query", () => {
			style.define(`
			.button { width: 50px }
			@media (max-width: 1200px) {
				.button { width: 100px }
			}
			`)
			expect(style.button).to.eql("a b")
			expect(registry.toStyleSheet()).to.eql(".a{width:50px}@media (max-width: 1200px){.b{width:100px}}")
		})

		it("Media query 2", () => {
			style.define(`
			.button { width: 50px }
			.another { width: 100px }
			@media (max-width: 1200px) {
				.button { width: 100px }
				.xyz { width: 100px }
			}
			`)
			expect(style.button).to.eql("a b")
			expect(style.another).to.eql("c")
			expect(style.xyz).to.eql("b")
			expect(registry.toStyleSheet()).to.eql(".a{width:50px}.c{width:100px}@media (max-width: 1200px){.b{width:100px}}")
		})
	})
})
