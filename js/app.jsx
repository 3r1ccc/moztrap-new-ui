var Router = window.ReactRouter;
var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;
var RouteHandler = Router.RouteHandler;

var App = React.createClass({
  render: function() {
    return (<RouteHandler {...this.props}/>)
  }
});

var SearchableRemoteListMixin = {
  //need to implement `function buildURL(query) {...}`
  loading: {meta:{}, objects: [{name:"Loading..."}]},
  notFound: {data:{objects:[{name:"Can't find anything. Try loosen the search criteria."}]}},
  loadRemoteData: function(url) {
    $.ajax({
      url: url,
      dataType: 'jsonp',
      timeout: 10000, // Force trigger the error callback

      success: function(data) {
        this.setState({data: data});
      }.bind(this),

      /*
      FIXME: this doesn't seem to work under jsonp proxy
      statusCode: {
        400: function() {
          alert.log('bad request');
        },
      },
      */
      error: function(xhr, status, err) {
        this.setState(this.notFound)
        console.error(xhr, status, err.toString());
      }.bind(this)
    });
  },
  //FIXME: Change this to pagination
  loadMore: function() {
    //FIXME: dont' hardcode this url
    var url = "https://moztrap.mozilla.org" + this.state.data.meta.next;
    console.log(url)
    $.ajax({
      url: url,
      dataType: 'jsonp',

      success: function(data) {
        console.log(data)
        data.objects = this.state.data.objects.concat(data.objects)
        this.setState({data: data});
      }.bind(this),

      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  getInitialState: function() {
    return {query: "product:\"Firefox OS\"", data: this.loading};
  },

  componentDidMount: function() {
    this.loadRemoteData(this.buildURL(this.state.query));
  }, 
  
  handleSearch: function(query) { 
    console.log(query)
    this.loadRemoteData(this.buildURL(query));
    this.setState({query: query, data: this.loading});
  },

  componentWillReceiveProps: function() {
    this.setState({data: this.loading})
    this.loadRemoteData(this.buildURL(this.state.query));
  },

}

var SearchForm = React.createClass({
  handleSubmit: function(e) {
    e.preventDefault();
    this.props.onSubmit(this.refs.searchbox.getDOMNode().value);
  },
  render: function() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input type="text" id="searchInput" ref="searchbox" defaultValue={this.props.query} />
        <button type="submit" id="searchSubmit">Search</button>
      </form>
    )
  }
});

var CaseverListItem = React.createClass({
  render: function() {
    return (
      <div className="caseverListItem">
        <input type="checkbox"/>
        <div className="status">
          {this.props.casever.status}
        </div>
        <div className="name">
          {this.props.casever.name}
        </div>
      </div>
    )
  }
});

var CaseverList = React.createClass({
  render: function() {
    //can use the casevers.meta
    var casevers = this.props.casevers.objects.map(function(casever){
      return (<CaseverListItem casever={casever} />)
    })

    return (
      <div className="caseverList">
        {casevers}
        <a href="javascript:void(0);" onClick={this.props.onLoadMore}>more</a>
      </div>
    )
  }
});

var SearchableCaseverList = React.createClass({
  mixins: [SearchableRemoteListMixin],
  api_url: "https://moztrap.mozilla.org/api/v1/caseversion/",
  //TODO: migrate to api_url: "https://moztrap.mozilla.org/api/v1/caseversionsearch/",
  buildURL: function(query) {
      var limit=20
      return buildQueryUrl(this.api_url, query, caseversionCodegen) + "&limit=" + limit;
  },
  handleLoadMore: function() {
    this.loadMore();
  },

  render: function() {
    return (
      <div>
        <SearchForm query={this.state.query} onSubmit={this.handleSearch}/>
        <CaseverList casevers={this.state.data} onLoadMore={this.handleLoadMore}/>
      </div>
    )
  }
})

var SuiteListItem = React.createClass({
  render: function() {
    return (
      <div className="suiteListItem">
        <input type="checkbox"/>
        <div className="status">
          {this.props.suite.status}
        </div>
        <div className="name">
          <a href={"./index.html#/suite/" + this.props.suite.id}> 
            {this.props.suite.name}
          </a>
        </div>
      </div>
    )
  }
});

var SuiteList = React.createClass({
  render: function() {

    var suites = this.props.suites.objects.map(function(suite){
      return (<SuiteListItem suite={suite} />)
    })

    return (
      <div className="suiteList">
        {suites}
      </div>
    )
  }
});

var SearchableSuiteList = React.createClass({
  mixins: [SearchableRemoteListMixin],
  api_url: "https://moztrap.mozilla.org/api/v1/suite/",
  buildURL: function(query) {
      var limit=20
      return buildQueryUrl(this.api_url, query, suiteCodegen) + "&limit=" + limit;
  },

  render: function() {
    return (
      <div>
        <SearchForm query={this.state.query} onSubmit={this.handleSearch}/>
        <SuiteList suites={this.state.data}/>
      </div>
    )
  }
});

SearchableCaseverSelectionList = React.createClass({
  mixins: [SearchableRemoteListMixin],
  api_url: "https://moztrap.mozilla.org/api/v1/caseversionselection/",
  buildURL: function(query) {
      var limit=20
      var url = buildQueryUrl(this.api_url, query, caseversionCodegen);
      url += "&case__suites" + (this.props.isNotIn?"__ne":"") + "=" + this.props.suiteId;
      url += "&limit=" + limit;
      return url
  },

  render: function() {
    return (
      <div>
        <SearchForm query={this.state.query} onSubmit={this.handleSearch}/>
        <CaseverList casevers={this.state.data}/>
      </div>
    )
  }
});

var AddToSuite = React.createClass({
  //mixins: [Router.State],
  api_url: "https://moztrap.mozilla.org/api/v1/suite/",
  loadSuite: function(id) {
    $.ajax({
      url: this.api_url + id + "/",
      dataType: 'jsonp',

      success: function(data) {
        this.setState({suite: data});
      }.bind(this),

      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });

  },
  
  getInitialState: function() {
    return {suite: {name: "Loading...", id: this.props.params.id}};
  },

  componentDidMount: function() {
    this.loadSuite(this.props.params.id);
  },

  componentWillReceiveProps: function() {
    //this.setState{suite: {name: "Loading...", id: this.props.params.id}}
    this.setState({suite: {id: this.props.params.id}});
    this.loadSuite(this.props.params.id);
  },

  render: function() {
    return (
      <div>
        <h2>{this.state.suite.name}</h2>
        <h1>Add to suite </h1>
        <SearchableCaseverSelectionList isNotIn={true} suiteId={this.state.suite.id}/>
        <h1>Remove from suite </h1>
        <SearchableCaseverSelectionList isNotIn={false} suiteId={this.state.suite.id}/>
      </div>
    )
  }
})

        //<SearchableCaseverList suiteId={this.state.suite.id}/>
//React.render(
//  <SearchableCaseverList url={apiUrl}/>,
//  document.getElementById("content")
//);

var routes = (
  <Route name="app" path="/" handler={App}>
    <DefaultRoute handler={SearchableCaseverList}/>
    <Route name="caseversions" path="/caseversion" handler={SearchableCaseverList}/>
    <Route name="suites" path="/suite" handler={SearchableSuiteList}/>
    <Route name="suites_noid" path="/suite/" handler={SearchableSuiteList}/>
    <Route name="suite" path="/suite/:id" handler={AddToSuite} />
  </Route>
);

Router.run(routes, function(Handler, state) {
  var params = state.params;
  React.render(<Handler params={params}/>, document.body);
})
