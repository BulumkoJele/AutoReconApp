const express = require('express')
const dnsModule = require('dns')
const { MongoClient } = require('mongodb')
const jwt = require('jsonwebtoken')
const app = express()

const databaseURL = 'mongodb+srv://BulumkoJele:Moneytalks@studybuddy.hfgmyrx.mongodb.net/?retryWrites=true&w=majority'
const client = new MongoClient(databaseURL)


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static('public'))
app.use('/static', express.static('public'))

async function connectToDB(){
    try{
      await client.connect()
      console.log('Connected to database')
    }
    finally{
      //await client.close()
    }
}
connectToDB()
const db = client.db('users')
const userInfo = db.collection('details')

app.get('/',(req, res)=>{
    res.sendFile(__dirname+'/public/'+'index.html')
})
app.get('/about',(req, res)=>{
    res.sendFile(__dirname+'/public/'+'about.html')
})
app.get('/contact',(req, res)=>{
    res.sendFile(__dirname+'/public/'+'contact.html')
})

app.post('/register',async (req, res)=>{
    const {name, email, password} = req.body;
    const userExists = await userInfo.findOne({email})
    if(userExists){
        res.send({message:'User already exists!'})
    }
    await userInfo.insertOne({name,email,password})
    res.send({message : 'Successful registration!'})
    })

app.post('/login',async (req, res)=>{
    const {email, password} = req.body;
    try {
        const userExists = await userInfo.findOne({email})
        if(userExists && userExists.password === password){
            const token = jwt.sign(email, 'qwertfdsdsdfvdscerdsfcexdsxvc')
            res.send({message : 'Successful login!',token:token})
        }
        else{
            res.send({message : 'Wrong email or password!'})
        }
        
    } catch (error) {
        res.send({message:'Something went wrong, try again!'})
    }
})

app.get('/gather', (req, res)=>{
    res.sendFile(__dirname+'/public/'+'gather.html')
})
app.post('/gather', async (req, res)=>{
    const textTargets = req.body.targetList
    const results = []

    for(let target of textTargets){
        const query = await findInfo(target)
        results.push({origin: target, subdomains:query})
    }
    res.send(results)
})
app.listen(3000)

async function findInfo(domain) {
    const subdomainURL = `https://subdomains.whoisxmlapi.com/api/v1?apiKey=at_S86iAWDa3q4q3XOQ7HQ62HFEt6jIF&domainName=${domain}&outputFormat=JSON`;
    const domainInfo = [];

    try {
        const subdomains = await fetch(subdomainURL).then(response => response.json());

        for (let subdomain of subdomains['result']['records']) {
            const subdomainInfo = {
                url: subdomain['domain'],
            };

            // Wait for DNS resolution before pushing to domainInfo
            const addresses = await resolveDns(subdomain['domain']);
            subdomainInfo['ip'] = addresses;

            // Get IP info for each resolved IP address
            for (let ipAddress of addresses) {
                await getIP(ipAddress)
                    .then(ipData => {
                        // Add IP info to subdomainInfo
                        subdomainInfo[ipAddress] = ipData;
                    })
                    .catch(error => {
                        console.error(`Error getting IP info for ${ipAddress}:`, error);
                    });
            }

            domainInfo.push(subdomainInfo);
        }
    } catch (error) {
        console.error('Error:', error);
    }

    return domainInfo;
}

async function getIP(address) {
    const url = `https://internetdb.shodan.io/${address}`;

    try {
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.error(`Error: ${response.status} - ${response.statusText}`);
            return null; // Returning null in case of an error
        }
    } catch (error) {
        console.error('Error:', error);
        return null; // Returning null in case of an error
    }
}

const resolveDns = (domain) => {
    return new Promise((resolve, reject) => {
        dnsModule.resolve4(domain, (err, records) => {
            if (err) {
                console.error(`Error resolving DNS for ${domain}:`, err);
                resolve([]);
            } else {
                resolve(records);
            }
        });
    });
}
