import Crawler from "crawler";
import {writeJsonFile} from 'write-json-file';

const verbose = 0; //0,1,2
const pages = [];
const buttons = [];
const errors = [];
const buttonsByPathname = [];
const cpwmedspa = {pages:pages, buttons:buttons, errors:errors, buttonsByPathname:buttonsByPathname};
const addToResult = (button) => {
    let pn = buttonsByPathname.find(p => p.pathname == button.href.split("?")[0]);
    if (pn == undefined) {
        let obj = {pathname:button.href, buttons:[button]};
        buttonsByPathname.push(obj);
        buttons.push(button.href.split('?').shift());
    } else {
        pn.buttons.push(button);
    }
}
const domain = "cpwmedspa.com";
const c = new Crawler({
    maxConnections: 10,
    // This will be called for each crawled page
    callback: async (error, response, done) => {
        if (error) {
            errors.push({page: (response != undefined && response.requestUrl != undefined && response.requestUrl.pathname != undefined) ? response.requestUrl.pathname : "unknown", type: error });
            console.error(error);
        } else if (response.$ == undefined) {
            // Squarespace bug where the /search page triggers a a "save as" dialog
            errors.push({page: response.requestUrl, type: 'Response malformed'});
            console.error("Response malformed or not a page for " + response.requestUrl);
        } else {
            const $ = response.$;
            let pathname = response.requestUrl.pathname;
            let result = [];
            let path = "div:has(>div>figure>div>a.sqs-block-image-link)";
            $(path).each(function(){
                if ($(this).find(">div>figure>div>a:not([href*=http])").length > 0) {
                    let id = $(this).attr("id");
                    let buttonId = $("div#"+ id
                                     +"+div.sqs-block-button:has(>div>div>a)").attr("id");
                    let imageButton = {
                        doc:pathname,
                        href:$(this).find(">div>figure>div.intrinsic>a").attr("href"),
                        title:$(this).find(">div>figure>figcaption > div > div.image-title-wrapper p").html(),
                        subtitle:($(this).find(">div>figure>figcaption > div > div.image-subtitle-wrapper p").html()!= undefined)
                            ? $(this).find(">div>figure>figcaption > div > div.image-subtitle-wrapper p").html()
                            : ""
                    };
                    result.push(imageButton);
                    addToResult(imageButton);
                    if ($("div#" + buttonId + ">div>div>a") != undefined) {
                        if ($("div#" + buttonId + ">div>div>a").attr("href") != imageButton.href){
                            errors.push({page:imageButton.doc, type:'Button links mismatch', data: `${imageButton.title} | ${imageButton.subtitle}:"${imageButton.href}" vs. "${$("div#" + buttonId + ">div>div>a").attr("href")}"`});
                            console.error(imageButton.doc + ": Button links for '"
                                          + imageButton.title
                                          + "|" + imageButton.subtitle
                                          + "' don't match:\n->" + imageButton.href 
                                          + "\n->"+$("div#" + buttonId + ">div>div>a").attr("href")
                                          
                                        );
                        }
                        imageButton.label = $("div#" + buttonId + ">div>div>a").html().replace(/\n/g, "").trim();
                    } else {
                            errors.push({page:imageButton.doc, type: 'Image Button without corresponding Button', data: `${imageButton.title}|${imageButton.subtitle}: ${imageButton.href}` })
                        console.info("Image Button without corresponding Button:"
                                     + " site: " + imageButton.doc
                                     + " button: " + imageButton.title
                                     + "|" + imageButton.subtitle
                                     + " (" + imageButton.href +")");
                    }
                }
            })
            if (verbose > 1) console.log(`${pathname} buttons:\n ${result}`);
            //find buttons without links
            $("div:has(>div>figure:not(:has(a)))+div>div>div>a.sqs-block-button-element--medium").each(function(){
                let btn = $(this).find(">div>figure.figcaption")
                errors.push({
                    page: pathname,
                    type: 'Button without a link',
                    data: $(this).text()
                })
                console.error(`${pathname}: Button witout a link ${$(this).text()}`);

            });
            //serach for links
            $("a").each(function() {
                let newPathname = $(this).attr("href").split(domain).pop().split("?")[0].split("#")[0];
                if (newPathname.charAt(newPathname.length -1) == "/") {
                    newPathname = newPathname.slice(0, -1)
                }
                if ( newPathname == "#" || newPathname == "" || newPathname == "/"
                    || newPathname.split(".").pop() == "pdf"
                    || newPathname.indexOf("images.squarespace-cdn.com") > - 1
                    || newPathname.indexOf("mailto:") == 0
                    || newPathname.indexOf("tel:") == 0
                    || pages.indexOf(domain + newPathname) > -1
                    || ($(this).attr("href").indexOf(domain) == -1 
                        && $(this).attr("href").substring(0,1) != "/"
                    )
            ) {
                    if (verbose > 2) console.log("skipping: ", $(this).attr("href"));
                    return true;
                } else {
                    if ($(this).attr("href").indexOf("#") > -1 && $(this).attr("href").indexOf("/#") == -1) {
                        errors.push({page:pathname, type:'Anchor without path', data: $(this).attr("href") + " in " + pathname});
                        console.error("Anchor link without path: " + $(this).attr("href") + " in " + pathname);
                    };
                    pages.push(domain + newPathname);
                    if (verbose) console.log("next: ", pages.length, domain + newPathname);
                    c.add("http://www." + domain + newPathname);
                    if (pages.length > 120) {
                        errors.push({page: pathname, type: 'Too many crawl requests - likely a recursion bug in the crawler'});
                        console.error("Seems like too many crawl requests, likely a bug: " + JSON.stringify(pages));
                        return false;
                    }
                }
            });
        }
        await writeJsonFile('public/javascripts/cpwmedspa.json', cpwmedspa);
        await writeJsonFile('public/javascripts/errors.json', errors);
        await writeJsonFile('public/javascripts/pages.json', pages);
        if (errors.length == 0) {
            errors.push({type: 'No errors detected'});
        }
        await writeJsonFile('public/javascripts/buttons.json', buttons);
        const data = [];
        buttonsByPathname.forEach((path) => { 
            path.buttons.forEach((button) => {
                data.push({
                    Path:`http://www.${domain}${path.pathname}`, 
                    Page:`http://www.${domain}${button.doc}`,
                    Title:button.title,
                    Subtitle:button.subtitle,
                    Label:button.label,
                    Href:`http://www.${domain}${button.href}`
                });
            });
        });
        await writeJsonFile('public/javascripts/data.json', data);
        done();
    },
});

pages.push(domain);
c.add("http://www." + domain);
//pages.push(domain + "/search");
//c.add("http://www." + domain + "/search?q=crawl");