import com.catalyst.Context;
import com.catalyst.basic.BasicIO;
import com.catalyst.basic.ZCFunction;

import java.util.logging.Logger;
import java.util.logging.Level;

import com.zc.common.ZCProject;
import com.zc.component.cache.ZCCache;

public class Test implements ZCFunction {
	private static final Logger LOGGER = Logger.getLogger(Test.class.getName());
	
	@Override
    public void runner(Context context, BasicIO basicIO) throws Exception {
		try {
			ZCProject.initProject();
			String name = (String) basicIO.getParameter("name");
			LOGGER.log(Level.INFO, "Hello "+name);
			ZCCache.getInstance().putCacheValue("Test", "Working", 1l);
			basicIO.setStatus(200);
		}
		catch(Exception e) {
			LOGGER.log(Level.SEVERE,"Exception in Test",e);
			basicIO.setStatus(500);
		}
        basicIO.write("Hello From Test.java");
	}
	
}