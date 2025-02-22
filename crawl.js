import Crawler from "crawler";
import {writeJsonFile} from 'write-json-file';

const verbose = 0; //0,1,2
const pages = [];
const buttons = [];
const errors = [];
const buttonsByPathname = [];
const cpwmedspa = {pages:pages, buttons:buttons, errors:errors, buttonsByPathname:buttonsByPathname, timestamp: Math.floor((new Date()).getTime() / 1000)};
const addToResult = (button) => {
    let url = button.href.split("?")[0].split("/#")[0].trim()
    let pn = buttonsByPathname.find(p => p.pathname == url);
    if (pn == undefined) {
        let obj = {pathname:url, buttons:[button]};
        buttonsByPathname.push(obj);
        buttons.push(url);
    } else {
        pn.buttons.push(button);
    }
}
const domain = "cpwmedspa.com";
function compareByFields(a, b, primary, secondary) {
    if (a[primary] < b[primary]) {
        return -1;
    }
    if (a[primary] > b[primary]) {
        return 1;
    }
    if (secondary != undefined) {
        if (a[secondary] < b[secondary]) {
            return -1;
        }
        if (a[secondary] > b[secondary]) {
            return 1;
        }
    }
    return 0;
}
function compare(a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}
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
            let position = 1;
            $(path).each(function(){
                if ($(this).find(">div>figure>div>a:not([href*=http])").length > 0) {
                    let id = $(this).attr("id");
                    let buttonId = $("div#"+ id
                        +"+div.sqs-block-button:has(>div>div>a)").attr("id");
                    let href = $(this).find(">div>figure>div>a").attr("href");
                    let imageButton = {
                        position:position++,
                        doc:pathname,
                        href:href,
                        anchor:(href.split("#").length > 1) ? `#${href.split("#")[1]}` : "",
                        params:(href.split("/#")[0].split("?").length > 1) ? href.split("?")[1] : "",
                        title:$(this).find(">div>figure>figcaption > div > div.image-title-wrapper p").html(),
                        subtitle:($(this).find(">div>figure>figcaption > div > div.image-subtitle-wrapper p").html()!= undefined)
                        ? $(this).find(">div>figure>figcaption > div > div.image-subtitle-wrapper p").html()
                        : ""
                    };
                    if (href.split("#").length > 1) {
                        if (href.split("#")[0].slice(-1) != "/") {
                            errors.push({page:imageButton.doc, type: "Anchor without preceeding '/'", data: `${imageButton.title}|${imageButton.subtitle}: ${imageButton.href}`});
                            console.error("Anchor without preceeding '/':"
                                + " site: " + imageButton.doc
                                + " button: " + imageButton.title
                                + "|" + imageButton.subtitle
                                + " (" + imageButton.href +")");
                        }
                    }
                    result.push(imageButton);
                    addToResult(imageButton);
                    if ($(this).find(">div>figure").hasClass("combination-animation-fade-in") == false) {
                        errors.push({page:imageButton.doc, type: 'Image Button without fade-in animation', data: `${imageButton.title}|${imageButton.subtitle}: ${imageButton.href}` })
                        console.info("Image Button without fade-in animation:"
                                    + " site: " + imageButton.doc
                                    + " button: " + imageButton.title
                                    + "|" + imageButton.subtitle
                                    + " (" + imageButton.href +")");
                    }
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
                } else {
                    let link = $(this).find(">div>figure>div>a");
                    if (link.attr("href").indexOf(".") == -1) {
                        errors.push({page:pathname, type: 'Invalid link', data: link.attr("href")});
                        console.error(`${pathname}: Invalid link ${link.attr("href")}`);
                    }
                }
            })
            if (verbose > 1) console.log(`${pathname} buttons:\n ${JSON.stringify(result)}`);
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
        cpwmedspa.buttonsByPathname.sort((a, b) => compareByFields(a, b, 'pathname'));
        cpwmedspa.buttonsByPathname.forEach((path) => {
            path.buttons.sort((a, b) => compareByFields(a, b, 'doc'));
        })
        await writeJsonFile('public/javascripts/cpwmedspa.json', cpwmedspa);
        await writeJsonFile('public/javascripts/errors.json', errors);
        pages.sort((a, b) => compare(a, b));
        await writeJsonFile('public/javascripts/pages.json', pages);
        if (errors.length == 0) {
            errors.push({type: 'No errors detected'});
        }
        buttons.sort((a, b) => compare(a, b));
        await writeJsonFile('public/javascripts/buttons.json', buttons);
        const data = [];
        buttonsByPathname.forEach((path) => { 
            path.buttons.forEach((button) => {
                data.push({
                    Position:button.position,
                    Path:path.pathname, 
                    Page:button.doc,
                    PageHref:`http://www.${domain}${button.doc}`,
                    Anchor:button.anchor,
                    Params:button.params,
                    Title:button.title,
                    Subtitle:button.subtitle,
                    Label:button.label,
                    Href:`http://www.${domain}${button.href}`
                });
            });
        });
        data.sort((a, b) => compareByFields(a, b, 'Page','Position'));
        await writeJsonFile('public/javascripts/data.json', data);
        /*
        */
        done();
    },
});


pages.push(domain);
c.add("http://www." + domain);

//pages.push(domain + "/search");
//c.add("http://www." + domain + "/search?q=crawl");

export async function startCrawl() {
    
    //c.add("http://www." + domain);
    if (false) {
        await writeJsonFile('public/javascripts/cpwmedspa.json', -[]);
        await writeJsonFile('public/javascripts/errors.json', []);
        await writeJsonFile('public/javascripts/pages.json', []);
        await writeJsonFile('public/javascripts/buttons.json', []);
        await writeJsonFile('public/javascripts/buttons.json', []);
    }
    
    return new Promise((resolve, reject) => {
        
        pages.push(domain);
        c.add([{
            url: "http//www." + domain,
            callback: async (error, res, done) => {
                console.log(`found: ${res.data}`)
                if (error) {
                    reject(error);
                } else {
                    try {
                        /***************
                         * Don't use without implemented sorting of JSON above
                         * 
                         */

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
                        console.log(`data length ${JSON.stringify(data).length}`)

/*
*/
                        //await writeJsonFile('./public/javascripts/pages.json', pages);
                        //await writeJsonFile('./public/javascripts/buttons.json', buttons);
                        //await writeJsonFile('./public/javascripts/errors.json', errors);
                        //await writeJsonFile('./public/javascripts/buttonsByPathname.json', buttonsByPathname);
                        /*
                        */
                        resolve({pages, buttons, errors});

                    } catch (err) {
                        reject(err);
                    }
                }
                done();
            }
        }]);
    });
}