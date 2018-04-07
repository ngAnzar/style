import { expect } from "chai"
import { newStyle, Loader, Registry } from "../src"


describe("Scoped style", () => {
	let style, loader, registry
	beforeEach(() => {
		loader = new Loader()
		registry = new Registry()
		style = newStyle(loader, registry)
	})

	it("New scope", () => {
		style.define(".button{width:10px}")
		expect(style.button).to.eql("a")
		expect(registry.toStyleSheet()).to.eql(".a{width:10px}")

		const scope = style.newScope("uid")
		scope.define(".button{height:20px}")
		expect(style.button).to.eql("a")
		expect(registry.toStyleSheet()).to.eql(".a{width:10px}") // currently second style is not consumed

		expect(scope.button).to.eql("a b")
		expect(registry.toStyleSheet()).to.eql(".a{width:10px}.b{height:20px}")
	})

	// it("New scope with namespace", () => {
	// 	style.define(".button{width:10px}")
	// 	expect(style.button).to.eql("a")

	// 	const scope = style.newScope("uid", "ns")
	// 	scope.define(".button{height:20px}")
	// 	expect(style.button).to.eql("a")
	// 	expect(scope.button).to.eql("a ns-b")
	// })

	describe("Destroy scope", () => {
		it("Different properties", () => {
			style.define(".button{width:10px}")
			expect(style.button).to.eql("a")

			let scope = style.newScope("uid")
			scope.define(".button{height:20px}")
			expect(scope.button).to.eql("a b")

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}.b{height:20px}")

			scope.dispose()

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}")
		})

		it("Same properties (reference counting)", () => {
			style.define(".button{width:10px}")
			expect(style.button).to.eql("a")

			let scope = style.newScope("uid")
			scope.define(".button{width:10px}")
			expect(scope.button).to.eql("a")

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}")

			scope.dispose()

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}")
		})

		it("Destroy child and parent", () => {
			style.define(".button{width:10px}")
			expect(style.button).to.eql("a")

			let scope = style.newScope("uid")
			scope.define(".button{height:20px}")
			expect(scope.button).to.eql("a b")

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}.b{height:20px}")

			scope.dispose()

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}")

			style.dispose()

			expect(registry.toStyleSheet()).to.eql("")
		})

		it("Invoke dispose on root style", () => {
			style.define(".button{width:10px}")
			expect(style.button).to.eql("a")

			let scope = style.newScope("uid")
			scope.define(".button{height:20px}")
			expect(scope.button).to.eql("a b")

			expect(registry.toStyleSheet()).to.eql(".a{width:10px}.b{height:20px}")

			style.dispose()

			expect(registry.toStyleSheet()).to.eql("")
		})
	})

})