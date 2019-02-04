import { expect } from "chai"
import { CssLoader } from "../src/loader"


describe("Test loader funcionality", () => {
    describe("CssLoader", () => {
        it("Load simple rule", () => {
            let loader: any = new CssLoader()
            let group = loader.makeGroupId()
            loader.load(`.hello { width: 10px !important }`)

            expect(loader.entries).to.haveOwnProperty("hello")
            expect(loader.entries["hello"]).to.haveOwnProperty(group.id)
            expect(loader.entries["hello"][group.id].groupBy).to.eql(group)

            let rules = loader.entries["hello"][group.id].entries

            expect(rules).does.not.empty
            expect(rules[0].index).to.eql(1)
        })

        it("Load multiple rules with same selector", () => {
            let loader: any = new CssLoader()
            let group = loader.makeGroupId()
            loader.load(`.hello { width: 10px !important } .hello { height: 20px }`)

            let rules = loader.entries["hello"][group.id].entries

            expect(rules.length).to.eql(2)
            expect(rules[0].rules.width + "").to.eq("10px")
            expect(rules[1].rules.height + "").to.eq("20px")
        })

        it("Load unhandable rules", () => {
            let loader: any = new CssLoader()
            let group = loader.makeGroupId()
            loader.load(`div { width: 10px !important }`)

            expect(loader.unhandable).to.haveOwnProperty("div")
            expect(loader.unhandable["div"]).to.haveOwnProperty(group.id)
            expect(loader.unhandable["div"][group.id].groupBy).to.eql(group)

            let rules = loader.unhandable["div"][group.id].entries

            expect(rules).does.not.empty
        })

        it("Load @media", () => {
            let loader: any = new CssLoader()
            let group = loader.makeGroupId()
            let mediaGroupId = `media[screen and (max-width:600px)]`
            loader.load(`
                .hello { width: 20px }

                @media screen and (max-width: 600px) {
                    .hello { width: 10px }
                    div { height: 10px }
                }
                `)

            expect(loader.entries).to.haveOwnProperty("hello")
            expect(loader.entries.hello).to.haveOwnProperty(group.id)
            expect(loader.entries.hello).to.haveOwnProperty(mediaGroupId)
            expect(loader.entries.hello[mediaGroupId].entries.length).to.eql(1)
            expect(loader.entries.hello[mediaGroupId].entries[0].selector.nodes[0].name).to.eql("hello")

            expect(loader.unhandable).to.haveOwnProperty("div")
            expect(loader.unhandable["div"]).to.haveOwnProperty(mediaGroupId)
            expect(loader.unhandable["div"][mediaGroupId].entries.length).to.eql(1)
            expect(loader.unhandable["div"][mediaGroupId].entries[0].selector.nodes[0].name).to.eql("div")
        })

        it("Load @font-face", () => {
            let loader: any = new CssLoader()
            let fontGroupId = "font[FontFamilyName/normal/300]"
            loader.load(`
                @font-face {
                    font-family: FontFamilyName;
                    font-weight: 300;
                    font-style: normal;
                    src: local(Arial);
                }
            `)

            expect(loader.unhandable).to.haveOwnProperty("@font-face")
            expect(loader.unhandable["@font-face"]).to.haveOwnProperty(fontGroupId)
            expect(loader.unhandable["@font-face"][fontGroupId].entries.length).to.eql(1)
            expect(loader.unhandable["@font-face"][fontGroupId].entries[0].type).to.eql("font-face")
        })
    })
})
