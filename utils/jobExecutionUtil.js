// Retrieve CSRF Token
const getCSRFToken = async (url) => {
    const endpoint = "/SASJobExecution/"
    const response = await fetch(url + endpoint + "csrf", { method: "GET", credentials: "include" });
    return response.headers.get("x-csrf-token");
}
// Check job status
const checkStatus = async (token, url, jobId) => {
    const headers = {
        'Accept': 'text/plain',
        'X-CSRF-Token': token,
        'X-CSRF-Header': 'X-CSRF-Token'
    }
    const state = await fetch(`${url}/jobExecution/jobs/${jobId}/state`, {
        header: headers,
        credentials: "include"
    })
    return state.text()
}
// Retrieve job output
const retrieveJobOutput = async (token, url, jobId) => {
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        'X-CSRF-Header': 'X-CSRF-Token'
    }
    const request = await fetch(`${url}/SASJobExecution/?_jobexec=/jobExecution/jobs/${jobId}&_action=json`,
        {
            headers: headers,
            credentials: "include"
        }
    )
    const results = await request.json()
    const body = results.items.filter(item => item.name === "_webout.json")
    const responseData = await fetch(`${url}/${body[0].href}`, { headers: headers, credentials: "include" })
    const data = await responseData.json()
    return data
}
// Execute job
const executeJob = async (url, data, parameters) => {
    const csrfURL = `${url}/SASJobExecution/csrf`
    const csrfParameters = { method: "GET", credentials: "include" }
    const csrfRequest = await fetch(csrfURL, csrfParameters)
    const csrfToken = await csrfRequest.headers.get("x-csrf-token")
    const jobHeaders = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-CSRF-Header': 'X-CSRF-Token'
    }
    // Add extra url parameters
    parameters = {
        ...parameters,
        "_action": "background",
        "_output_type": "json"
    }
    // Convert the parameters to URLSearchParams
    const urlParameters = new URLSearchParams(parameters)
    // Call job
    const jobURL = `${url}/SASJobExecution/?${urlParameters}`
    const jobRequest = await fetch(jobURL, {
        method: "POST",
        headers: jobHeaders,
        credentials: "include",
        body: JSON.stringify(data)
    })
    // Retrieve jobID
    const jobInfo = await jobRequest.headers.get("x-sas-jobexec-id")
    // Check job status until completion or error
    let jobStatus = "running"
    do {
        jobStatus = await checkStatus(csrfToken, url, jobInfo)
    } while (jobStatus === "running")
    // Retrieve job output when job ended
    if (jobStatus === "completed") {
        const jobOutput = await retrieveJobOutput(csrfToken, url, jobInfo)
        return jobOutput
    } else {
        console.log(`Job ${jobInfo} failed, please contact your administrator`)
    }
}
