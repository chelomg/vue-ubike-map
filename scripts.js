var vm = new Vue({
    el: '#app',
    data: {
        ubikeStops: [],
        markers: [],
        map: null,
        searchName: '',
        currPage: 1,
        countOfPage: 10,
        cart: [],
        total: 0,
        currentStop: null
    },
    filters: {
    },
    computed: {
      filterStops() {
        var searchName = this.searchName;
        if (this.searchName.trim() !== '') {
          ubikeStops = this.ubikeStops.filter(function(d) { return d.sna.toUpperCase().indexOf(searchName.toUpperCase()) > -1; });
          return ubikeStops;
        }else {
          return this.ubikeStops;
        }
      },
      totalPage() {
        return Math.ceil(this.filterStops.length / this.countOfPage);
      },
      pageStart () {
        return (this.currPage - 1 ) * this.countOfPage;
      }
    },
    watch: {
      filterStops(){
        this.removeMakers();
        this.initalMakers();
        if (this.searchName.trim() !== '') {
          const firstStop = this.filterStops[0];
          this.setCenter(firstStop.sno, firstStop.lat, firstStop.lng, 0);
        }
      }
    },
    methods: {
      setPage(page) {
        if (page <= 0 || page > this.totalPage) { return; }
        this.currPage = page;
        this.changePage();
      },
      getUbikeData: function(){
        // 欄位說明請參照:
        // http://data.taipei/opendata/datalist/datasetMeta?oid=8ef1626a-892a-4218-8344-f7ac46e1aa48

        // sno：站點代號、 sna：場站名稱(中文)、 tot：場站總停車格、
        // sbi：場站目前車輛數量、 sarea：場站區域(中文)、 mday：資料更新時間、
        // lat：緯度、 lng：經度、 ar：地(中文)、 sareaen：場站區域(英文)、
        // snaen：場站名稱(英文)、 aren：地址(英文)、 bemp：空位數量、 act：全站禁用狀態

        axios.get('https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.gz')
        .then(res => {
          // 將 json 陣列後存入 this.ubikeStops
          this.ubikeStops = Object.keys(res.data.retVal).map(key => res.data.retVal[key]);
          this.initalMap();
          this.initalMakers();
        });
      },
      initalMap: function(){
        // 地圖初始設定
        const mapElement = document.getElementById("map");
        const mapOptions = {
          center: new google.maps.LatLng({ lat: 25.0485678, lng: 121.5173999 }),
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        this.map = new google.maps.Map(mapElement, mapOptions);

        //add InfoWindow.isOpen()
        google.maps.InfoWindow.prototype.isOpen = function() {
          var map = this.getMap();
          return (map != null && map != "undefined");
        };
      },
      initalMakers: function(){
        this.filterStops.forEach((coord) => {
          const position = new google.maps.LatLng(coord.lat, coord.lng);
          const marker = new google.maps.Marker({
            position,
            map: this.map,
            sno: coord.sno,
            title: coord.sna + ' 總停車格: ' + coord.tot + ' / 目前車輛: ' + coord.sbi,
            info: new google.maps.InfoWindow({
                    content:`
                    站場名稱: ${coord.sna}</br>
                    區域地址: ${coord.sarea} - ${coord.ar} </br>
                    總數量: ${coord.tot} </br>
                    目前車輛數量: ${coord.sbi}</br>
                    更新時間: ${this.timeFormat(coord.mday)}</br>`,
            })
          });
          //google.maps.event.addListener(marker, 'mouseover', () => info.open(marker.get('map'), marker));
          //google.maps.event.addListener(marker, 'mouseout', () => info.close());
          var self = this;

          google.maps.event.addListener(marker, 'click', function() {
            self.closeAllInfoWindow();
            this.info.open( this.map, this);
          });
          this.markers.push(marker);
        });
      },
      removeMakers: function(){
        if(this.markers.length !== 0){
          this.markers.forEach((marker) => {
            marker.setMap(null);
          });
          this.markers = [];
        }
      },
      timeFormat(t){

        var date = [], time = [];

        date.push(t.substr(0, 4));
        date.push(t.substr(4, 2));
        date.push(t.substr(6, 2));
        time.push(t.substr(8, 2));
        time.push(t.substr(10, 2));
        time.push(t.substr(12, 2));

        return date.join("/") + ' ' + time.join(":");
      },
      setCenter(sno, lat, lng, key){
        this.setCurrentStop(key);
        this.map.setZoom(15);
        this.map.setCenter(new google.maps.LatLng(lat, lng));
        this.openCurrentInfo(sno);
      },
      setCurrentStop(key){
        if(this.currentStop !== null){
          document.querySelector(`tbody tr[id="${this.currentStop}"]`).style = null;
        }
        document.querySelector(`tbody tr[id="${key}"]`).style.backgroundColor = "#FFA500";
        this.currentStop = key;
      },
      openCurrentInfo(sno){
        var marker = this.markers.filter( d => { return d.sno === sno })[0];
        this.closeAllInfoWindow();
        marker.info.open( marker.map, marker );
      },
      changePage(){
        document.querySelector(`tbody tr[id="${this.currentStop}"]`).style = null;
      },
      closeAllInfoWindow(){
        //close all InfoWindow
        this.markers.map( m => { if(m.info.isOpen()) m.info.close(); });
      }
    },
    created() {
      this.getUbikeData();
    },
})
